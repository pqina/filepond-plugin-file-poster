import { createPosterView } from './createPosterView';
import { createPosterOverlayView } from './createPosterOverlayView';
import { getImageSize } from '../utils/getImageSize';
import { addGradientSteps } from '../utils/addGradientSteps';
import { calculateAverageColor } from '../utils/calculateAverageColor';

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

const loadImage = (url, crossOriginValue) => new Promise((resolve, reject) => {
    const img = new Image();
    if (typeof crossOrigin === 'string') {
        img.crossOrigin = crossOriginValue;
    }
    img.onload = () => {
        resolve(img);
    };
    img.onerror = e => {
        reject(e);
    };
    img.src = url;
});

export const createPosterWrapperView = _ => {

    // create overlay view
    const overlay = createPosterOverlayView(_);

    /**
     * Write handler for when preview container has been created
     */
    const didCreatePreviewContainer = ({ root, props }) => {
        
        const { id } = props;

        // we need to get the file data to determine the eventual image size
        const item = root.query('GET_ITEM', id);
        if (!item) return;
        
        // get url to file
        const fileURL = item.getMetadata('poster');

        // image is now ready
        const previewImageLoaded = data => {

            // calculate average image color, is in try catch to circumvent any cors errors
            const averageColor = root.query('GET_FILE_POSTER_CALCULATE_AVERAGE_IMAGE_COLOR') ? calculateAverageColor(data) : null;
            item.setMetadata('color', averageColor, true);
            
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
            loadImage(fileURL, root.query('GET_FILE_POSTER_CROSS_ORIGIN_ATTRIBUTE_VALUE')).then(previewImageLoaded);
        
        });
    };

    /**
     * Write handler for when the preview has been loaded
     */
    const didLoadPreview = ({ root }) => {
        root.ref.overlayShadow.opacity = 1;
    };

    /**
     * Write handler for when the preview image is ready to be animated
     */
    const didDrawPreview = ({ root }) => {
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
    const create = ({ root, props }) => {

        // image view
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
