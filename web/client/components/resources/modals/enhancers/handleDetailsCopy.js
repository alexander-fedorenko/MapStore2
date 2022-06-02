/*
 * Copyright 2020, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Rx from 'rxjs';
import GeoStoreApi from '../../../../api/GeoStoreDAO';
import MapUtils from '../../../../utils/MapUtils';

import { mapPropsStream } from 'recompose';

const getDetails = (detailsUri) => {
    const id = MapUtils.getIdFromUri(detailsUri);
    return Rx.Observable.defer(() => id ? GeoStoreApi.getData(id) : Promise.resolve());
};

export default mapPropsStream(props$ => {
    return props$.combineLatest(
        props$
            .filter(({detailsData}) => detailsData)
            .switchMap(props => {
                const details = props.detailsData;

                return getDetails(details).map(detailsText => {
                    const linkedResources = {
                        ...(props.linkedResources || {}),
                        details: {
                            category: 'DETAILS',
                            data: detailsText || 'NODATA'
                        }
                    };

                    if (props.onResourceLoad) {
                        props.onResourceLoad(props.resource, linkedResources);
                    }

                    return {
                        loading: false,
                        linkedResources
                    };
                })
                    .catch(e => Rx.Observable.of({ loading: false, errors: [e] }))
                    .startWith({ loading: true, resource: false });
            })
            .startWith({}),
        (p1, p2) => ({
            ...p1,
            ...p2
        })
    );
});
