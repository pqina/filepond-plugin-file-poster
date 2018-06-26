/*
 * FilePondPluginFilePoster 1.0.0
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
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

var plugin$1 = ({ addFilter, utils }) => {
  // get quick reference to Type utils
  const { createRoute, Type, isFile } = utils;

  // called for each view that is created right after the 'create' method
  addFilter('CREATE_VIEW', viewAPI => {
    // get reference to created view
    const { is, view, query } = viewAPI;

    // only hook up to item view and only if is enabled for this cropper
    if (!is('file') || !query('GET_ALLOW_IMAGE_PREVIEW')) {
      return;
    }

    // create the image preview plugin, but only do so if the item is an image
    const didLoadItem = ({ root, props, actions }) => {
      const { id } = props;
      const item = query('GET_ITEM', id);

      // item could theoretically have been removed in the mean time
      if (!item) {
        return;
      }

      // exit if poster is
      const poster = item.getMetadata('poster');
      if (!poster) {
        return;
      }

      root.ref.poster = document.createElement('div');
      root.ref.poster.className = 'filepond--file-poster';

      root.element.appendChild(root.ref.poster);

      const image = document.createElement('img');
      image.src = poster;
      root.ref.poster.appendChild(image);

      getImageSize(poster, (width, height) => {
        // we can now scale the panel to the final size
        root.dispatch('DID_POSTER_CALCULATE_SIZE', {
          id,
          width,
          height
        });
      });
    };

    const didCalculatePosterSize = ({ root, props, action }) => {
      // get item
      const item = root.query('GET_ITEM', { id: props.id });

      console.log('size calculated', action, root.rect.element.width);
      const ratio = action.height / action.width;

      // poster wrapper
      root.ref.poster.style.cssText = `height:${Math.round(
        root.rect.element.width * ratio
      )}px`;
      root.element.style.cssText = `height:${Math.round(
        root.rect.element.width * ratio
      )}px`;
    };

    // start writing
    view.registerWriter(
      createRoute({
        DID_LOAD_ITEM: didLoadItem,
        DID_POSTER_CALCULATE_SIZE: didCalculatePosterSize
      })
    );
  });

  return {
    options: {
      // Enable or disable file renaming
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
