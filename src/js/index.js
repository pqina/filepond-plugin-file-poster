import { createPosterWrapperView } from './view/createPosterWrapperView';

/**
 * File Poster Plugin
 */
const plugin = fpAPI => {

    const { addFilter, utils } = fpAPI;
    const { Type, createRoute } = utils;

    // filePosterView
    const filePosterView = createPosterWrapperView(fpAPI);

    // called for each view that is created right after the 'create' method
    addFilter('CREATE_VIEW', viewAPI => {
        
        // get reference to created view
        const { is, view, query } = viewAPI;

        // only hook up to item view and only if is enabled for this cropper
        if (!is('file') || !query('GET_ALLOW_FILE_POSTER')) {
            return;
        }

        // create the file poster plugin, but only do so if the item is an image
        const didLoadItem = ({ root, props, actions }) => {

            const { id } = props;
            const item = query('GET_ITEM', id);

            // item could theoretically have been removed in the mean time
            if (!item || !item.getMetadata('poster') || item.archived) {
                return;
            }

            // set preview view
            root.ref.filePoster = view.appendChildView(
                view.createChildView(filePosterView, { id })
            );

            // now ready
            root.dispatch('DID_FILE_POSTER_CONTAINER_CREATE', { id });
        };

        const didCalculatePreviewSize = ({ root, props, action }) => {

            // set new height
            const height = root.rect.element.width * (action.height / action.width);

            // time to resize
            root.dispatch('DID_UPDATE_PANEL_HEIGHT', {
                id: props.id,
                height
            });
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
            allowFilePoster: [true, Type.BOOLEAN],

            // Enables or disables reading average image color
            filePosterCalculateAverageImageColor: [false, Type.BOOLEAN]
        }
    };
};

// fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
if (isBrowser) {
    document.dispatchEvent(new CustomEvent('FilePond:pluginloaded', { detail: plugin }));
}

export default plugin;