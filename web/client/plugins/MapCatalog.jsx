/*
 * Copyright 2020, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import {Glyphicon} from 'react-bootstrap';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import { toggleControl } from '../actions/controls';
import {
    setFilterReloadDelay,
    triggerReload,
    saveMap,
    deleteMap
} from '../actions/mapcatalog';
import { userSelector } from '../selectors/security';
import {
    triggerReloadValueSelector,
    filterReloadDelaySelector,
    mapTypeSelector
} from '../selectors/mapcatalog';

import MapCatalogPanel from '../components/mapcatalog/MapCatalogPanel';
import DockPanel from '../components/misc/panels/DockPanel';
import Message from '../components/I18N/Message';
import { createPlugin } from '../utils/PluginsUtils';

import mapcatalog from '../reducers/mapcatalog';
import * as epics from '../epics/mapcatalog';
import {mapLayoutValuesSelector} from "../selectors/maplayout";
import DockContainer from "../components/misc/panels/DockContainer";
import ContainerDimensions from "react-container-dimensions";
import * as PropTypes from "prop-types";

/**
 * Allows users to existing maps directly on the map.
 * @memberof plugins
 * @class
 * @name MapCatalog
 */
class MapCatalogComponent extends React.Component {
    static propTypes = {
        allow3d: PropTypes.any,
        active: PropTypes.any,
        mapType: PropTypes.any,
        user: PropTypes.any,
        triggerReloadValue: PropTypes.any,
        filterReloadDelay: PropTypes.any,
        onToggleControl: PropTypes.func,
        onTriggerReload: PropTypes.func,
        onDelete: PropTypes.func,
        onSave: PropTypes.func,
        dockStyle: PropTypes.object,
        size: PropTypes.number
    };
    static defaultProps = {
        onToggleControl: () => {
        }, onTriggerReload: () => {
        }, onDelete: () => {
        }, onSave: () => {
        }, dockStyle: {},
        size: 550
    };

    render() {
        const {
            allow3d,
            active,
            mapType,
            user,
            triggerReloadValue,
            filterReloadDelay,
            onToggleControl,
            onTriggerReload,
            onDelete,
            onSave,
            dockStyle,
            size,
            ...props
        } = this.props;
        return (
            <DockContainer
                dockStyle={dockStyle}
                id="map-catalog-container"
                className="dock-container"
                style={{pointerEvents: 'none'}}
            >
                <ContainerDimensions>
                    {({width}) => (<DockPanel
                        className="map-catalog-dock-panel"
                        open={active}
                        position="right"
                        size={size / width > 1 ? width : size}
                        bsStyle="primary"
                        glyph="maps-catalog"
                        title={<Message msgId="mapCatalog.title"/>}
                        onClose={() => onToggleControl()}
                        style={dockStyle}>
                        <MapCatalogPanel
                            mapType={mapType}
                            user={user}
                            triggerReloadValue={triggerReloadValue}
                            filterReloadDelay={filterReloadDelay}
                            setFilterReloadDelay={props.setFilterReloadDelay}
                            onTriggerReload={onTriggerReload}
                            onDelete={onDelete}
                            onSave={onSave}
                            getShareUrl={(map) => map.contextName ?
                                `context/${map.contextName}/${map.id}` :
                                `viewer/${mapType}/${map.id}`
                            }
                            toggleCatalog={() => onToggleControl()}
                            shareApi/>
                    </DockPanel>)}
                </ContainerDimensions>
            </DockContainer>
        );
    }
}


export default createPlugin('MapCatalog', {
    component: connect(createStructuredSelector({
        active: state => state.controls && state.controls.mapCatalog && state.controls.mapCatalog.enabled,
        mapType: mapTypeSelector,
        user: userSelector,
        triggerReloadValue: triggerReloadValueSelector,
        filterReloadDelay: filterReloadDelaySelector,
        dockStyle: state => mapLayoutValuesSelector(state, { height: true, right: true }, true)
    }), {
        setFilterReloadDelay,
        onToggleControl: toggleControl.bind(null, 'mapCatalog', 'enabled'),
        onTriggerReload: triggerReload,
        onDelete: deleteMap,
        onSave: saveMap
    })(MapCatalogComponent),
    containers: {
        BurgerMenu: {
            name: 'mapcatalog',
            position: 6,
            text: <Message msgId="mapCatalog.title" />,
            icon: <Glyphicon glyph="maps-catalog" />,
            tooltip: "mapCatalog.tooltip",
            action: () => toggleControl('mapCatalog', 'enabled'),
            priority: 2,
            doNotHide: true
        },
        SidebarMenu: {
            name: "mapcatalog",
            position: 6,
            icon: <Glyphicon glyph="maps-catalog" />,
            tooltip: "mapCatalog.tooltip",
            action: () => toggleControl('mapCatalog', 'enabled'),
            priority: 2,
            doNotHide: true
        }
    },
    reducers: {
        mapcatalog
    },
    epics
});
