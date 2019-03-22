const applyTemplate = (source, target) => {
    // copy width and height
    target.width = source.width;
    target.height = source.height;

    // draw the template
    const ctx = target.getContext('2d');
    ctx.drawImage(source, 0, 0);
};

export const createPosterOverlayView = fpAPI =>
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
