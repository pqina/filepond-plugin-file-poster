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
        if (!is('file') || !query('GET_ALLOW_FILE_POSTER')) return;

        // create the file poster plugin, but only do so if the item is an image
        const didLoadItem = ({ root, props }) => {

            const { id } = props;
            const item = query('GET_ITEM', id);

            // item could theoretically have been removed in the mean time
            if (!item || !item.getMetadata('poster') || item.archived) return;

            // test if is filtered
            if (!query('GET_FILE_POSTER_FILTER_ITEM')(item)) return;

            // set preview view
            root.ref.filePoster = view.appendChildView(
                view.createChildView(filePosterView, { id })
            );

            // now ready
            root.dispatch('DID_FILE_POSTER_CONTAINER_CREATE', { id });
        };

        const didCalculatePreviewSize = ({ root, action }) => {

            // no poster set
            if (!root.ref.filePoster) return;

            // remember dimensions
            root.ref.imageWidth = action.width;
            root.ref.imageHeight = action.height;

            root.ref.shouldUpdatePanelHeight = true;

            root.dispatch('KICK');
        };

        // start writing
        view.registerWriter(
            createRoute({
                DID_LOAD_ITEM: didLoadItem,
                DID_FILE_POSTER_CALCULATE_SIZE: didCalculatePreviewSize
            }, ({ root, props }) => {

                // don't run without poster
                if (!root.ref.filePoster) return;

                // don't do anything while hidden
                if (root.rect.element.hidden) return;

                // should we redraw
                if (root.ref.shouldUpdatePanelHeight) {

                    // time to resize the parent panel
                    root.dispatch('DID_UPDATE_PANEL_HEIGHT', {
                        id: props.id,
                        height: root.rect.element.width * (root.ref.imageHeight / root.ref.imageWidth)
                    });

                    // done!
                    root.ref.shouldUpdatePanelHeight = false;
                }

            })
        );
    });

    // expose plugin
    return {
        options: {

            // Enable or disable file poster
            allowFilePoster: [true, Type.BOOLEAN],

            // filters file items to determine which are shown as poster
            filePosterFilterItem: [() => true, Type.FUNCTION],

            // Enables or disables reading average image color
            filePosterCalculateAverageImageColor: [false, Type.BOOLEAN],

            // Allows setting the value of the CORS attribute (null is don't set attribute)
            filePosterCrossOriginAttributeValue: ['Anonymous', Type.STRING]
        }
    };
};

// fire pluginloaded event if running in browser, this allows registering the plugin when using async script tags
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
if (isBrowser) {
    document.dispatchEvent(new CustomEvent('FilePond:pluginloaded', { detail: plugin }));
}

export default plugin;