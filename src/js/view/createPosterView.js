const IMAGE_SCALE_SPRING_PROPS = {
    type: 'spring',
    stiffness: 0.5,
    damping: 0.45,
    mass: 10
};

export const createPosterView = _ =>
    _.utils.createView({
        name: 'file-poster',
        tag: 'div',
        ignoreRect: true,
        create: ({ root }) => {
            root.ref.image = document.createElement('img');
            root.element.appendChild(root.ref.image);
        },
        write: _.utils.createRoute({
            DID_FILE_POSTER_LOAD: ({ root, props }) => {
                const { id } = props;

                // get item
                const item = root.query('GET_ITEM', { id: props.id });
                if (!item) return;
                
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
