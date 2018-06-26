/*
 * FilePondPluginFilePoster 1.0.0
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
const IMAGE_SCALE_SPRING_PROPS = {
  type: 'spring',
  stiffness: 0.5,
  damping: 0.45,
  mass: 10
};

const createPosterView = _ =>
  _.utils.createView({
    name: 'file-poster',
    tag: 'div',
    ignoreRect: true,
    create: ({ root, props }) => {
      root.ref.image = document.createElement('img');
      root.element.appendChild(root.ref.image);
    },
    write: _.utils.createRoute({
      DID_FILE_POSTER_LOAD: ({ root, props, action }) => {
        const { id } = props;

        // get item
        const item = root.query('GET_ITEM', { id: props.id });

        // get poster
        const poster = item.getMetadata('poster');
        root.ref.image.src = poster;

        // let others know of our fabulous achievement (so the image can be faded in)
        root.dispatch('DID_FILE_POSTER_DRAW', { id });
      }
    }),
    mixins: {
      styles: ['scaleX', 'scaleY', 'opacity'],
      animations: {
        scaleX: IMAGE_SCALE_SPRING_PROPS,
        scaleY: IMAGE_SCALE_SPRING_PROPS,
        opacity: { type: 'tween', duration: 750 }
      }
    }
  });

const applyTemplate = (source, target) => {
  // copy width and height
  target.width = source.width;
  target.height = source.height;

  // draw the template
  const ctx = target.getContext('2d');
  ctx.drawImage(source, 0, 0);
};

const createPosterOverlayView = fpAPI =>
  fpAPI.utils.createView({
    name: 'file-poster-overlay',
    tag: 'canvas',
    ignoreRect: true,
    create: ({ root, props }) => {
      applyTemplate(props.template, root.element);
    },
    mixins: {
      styles: ['opacity'],
      animations: {
        opacity: { type: 'spring', mass: 25 }
      }
    }
  });

const getImageSize = (url, cb) => {
  let image = new Image();
  image.onload = () => {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    image = null;
    cb(width, height);
  };
  image.src = url;
};

const easeInOutSine = t => -0.5 * (Math.cos(Math.PI * t) - 1);

const addGradientSteps = (
  gradient,
  color,
  alpha = 1,
  easeFn = easeInOutSine,
  steps = 10,
  offset = 0
) => {
  const range = 1 - offset;
  const rgb = color.join(',');
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const stop = offset + range * p;
    gradient.addColorStop(stop, `rgba(${rgb}, ${easeFn(p) * alpha})`);
  }
};

const drawTemplate = (canvas, width, height, color, alphaTarget) => {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const horizontalCenter = width * 0.5;

  const grad = ctx.createRadialGradient(
    horizontalCenter,
    height + 110,
    height - 100,
    horizontalCenter,
    height + 110,
    height + 100
  );

  addGradientSteps(grad, color, alphaTarget, undefined, 8, 0.4);

  ctx.save();
  ctx.translate(-width * 0.5, 0);
  ctx.scale(2, 1);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const hasNavigator = typeof navigator !== 'undefined';

const width = 500;
const height = 200;

const overlayTemplateShadow = hasNavigator && document.createElement('canvas');
const overlayTemplateError = hasNavigator && document.createElement('canvas');
const overlayTemplateSuccess = hasNavigator && document.createElement('canvas');

if (hasNavigator) {
  drawTemplate(overlayTemplateShadow, width, height, [40, 40, 40], 0.85);
  drawTemplate(overlayTemplateError, width, height, [196, 78, 71], 1);
  drawTemplate(overlayTemplateSuccess, width, height, [54, 151, 99], 1);
}

const createPosterWrapperView = _ => {
  // create overlay view
  const overlay = createPosterOverlayView(_);

  /**
   * Write handler for when preview container has been created
   */
  const didCreatePreviewContainer = ({ root, props, action }) => {
    const { utils } = _;
    const { loadImage } = utils;
    const { id } = props;

    // we need to get the file data to determine the eventual image size
    const item = root.query('GET_ITEM', id);

    // get url to file (we'll revoke it later on when done)
    const fileURL = item.getMetadata('poster');

    // image is now ready
    const previewImageLoaded = data => {
      // the file url is no longer needed
      //URL.revokeObjectURL(fileURL);

      // the preview is now ready to be drawn
      root.dispatch('DID_FILE_POSTER_LOAD', {
        id,
        data
      });
    };

    // determine image size of this item
    getImageSize(fileURL, (width, height) => {
      // we can now scale the panel to the final size
      root.dispatch('DID_FILE_POSTER_CALCULATE_SIZE', {
        id,
        width,
        height
      });

      // create fallback preview
      loadImage(fileURL).then(previewImageLoaded);
    });
  };

  /**
   * Write handler for when the preview has been loaded
   */
  const didLoadPreview = ({ root, props }) => {
    root.ref.overlayShadow.opacity = 1;
  };

  /**
   * Write handler for when the preview image is ready to be animated
   */
  const didDrawPreview = ({ root, props }) => {
    const { image } = root.ref;

    // reveal image
    image.scaleX = 1.0;
    image.scaleY = 1.0;
    image.opacity = 1;
  };

  /**
   * Write handler for when the preview has been loaded
   */
  const restoreOverlay = ({ root }) => {
    root.ref.overlayShadow.opacity = 1;
    root.ref.overlayError.opacity = 0;
    root.ref.overlaySuccess.opacity = 0;
  };

  const didThrowError = ({ root }) => {
    root.ref.overlayShadow.opacity = 0.25;
    root.ref.overlayError.opacity = 1;
  };

  const didCompleteProcessing = ({ root }) => {
    root.ref.overlayShadow.opacity = 0.25;
    root.ref.overlaySuccess.opacity = 1;
  };

  /**
   * Constructor
   */
  const create = ({ root, props, dispatch }) => {
    const image = createPosterView(_);

    // append image presenter
    root.ref.image = root.appendChildView(
      root.createChildView(image, {
        id: props.id,
        scaleX: 1.25,
        scaleY: 1.25,
        opacity: 0
      })
    );

    // image overlays
    root.ref.overlayShadow = root.appendChildView(
      root.createChildView(overlay, {
        template: overlayTemplateShadow,
        opacity: 0
      })
    );

    root.ref.overlaySuccess = root.appendChildView(
      root.createChildView(overlay, {
        template: overlayTemplateSuccess,
        opacity: 0
      })
    );

    root.ref.overlayError = root.appendChildView(
      root.createChildView(overlay, {
        template: overlayTemplateError,
        opacity: 0
      })
    );
  };

  return _.utils.createView({
    name: 'file-poster-wrapper',
    create,
    write: _.utils.createRoute({
      // image preview stated
      DID_FILE_POSTER_LOAD: didLoadPreview,
      DID_FILE_POSTER_DRAW: didDrawPreview,
      DID_FILE_POSTER_CONTAINER_CREATE: didCreatePreviewContainer,

      // file states
      DID_THROW_ITEM_LOAD_ERROR: didThrowError,
      DID_THROW_ITEM_PROCESSING_ERROR: didThrowError,
      DID_THROW_ITEM_INVALID: didThrowError,
      DID_COMPLETE_ITEM_PROCESSING: didCompleteProcessing,
      DID_START_ITEM_PROCESSING: restoreOverlay,
      DID_REVERT_ITEM_PROCESSING: restoreOverlay
    })
  });
};

/**
 * Image Preview Plugin
 */
var plugin$1 = fpAPI => {
  const { addFilter, utils } = fpAPI;
  const { Type, createRoute } = utils;

  // imagePreviewView
  const imagePreviewView = createPosterWrapperView(fpAPI);

  // called for each view that is created right after the 'create' method
  addFilter('CREATE_VIEW', viewAPI => {
    // get reference to created view
    const { is, view, query } = viewAPI;

    // only hook up to item view and only if is enabled for this cropper
    if (!is('file') || !query('GET_ALLOW_FILE_POSTER')) {
      return;
    }

    // create the image preview plugin, but only do so if the item is an image
    const didLoadItem = ({ root, props, actions }) => {
      const { id } = props;
      const item = query('GET_ITEM', id);

      // item could theoretically have been removed in the mean time
      if (!item || !item.getMetadata('poster')) {
        return;
      }

      // set preview view
      root.ref.imagePreview = view.appendChildView(
        view.createChildView(imagePreviewView, { id })
      );

      // now ready
      root.dispatch('DID_FILE_POSTER_CONTAINER_CREATE', { id });
    };

    const didCalculatePreviewSize = ({ root, props, action }) => {
      // get item
      const item = root.query('GET_ITEM', { id: props.id });

      // set new height
      const height = root.rect.element.width * (action.height / action.width);

      // set height
      root.ref.imagePreview.element.style.cssText = `height:${Math.round(
        height
      )}px`;
    };

    // start writing
    view.registerWriter(
      createRoute({
        DID_LOAD_ITEM: didLoadItem,
        DID_FILE_POSTER_CALCULATE_SIZE: didCalculatePreviewSize
      })
    );
  });

  // expose plugin
  return {
    options: {
      // Enable or disable file poster
      allowFilePoster: [true, Type.BOOLEAN]
    }
  };
};

if (typeof navigator !== 'undefined' && document) {
  // plugin has loaded
  document.dispatchEvent(
    new CustomEvent('FilePond:pluginloaded', { detail: plugin$1 })
  );
}

export default plugin$1;
