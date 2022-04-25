/*
 * Copyright 2022, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';

import PropTypes from 'prop-types';
import ContainerDimensions from 'react-container-dimensions';
import {DropdownButton, Glyphicon, MenuItem} from "react-bootstrap";
import {connect} from "react-redux";
import {omit, pick} from "lodash";
import assign from "object-assign";
import {createSelector} from "reselect";
import {bindActionCreators} from "redux";

import ToolsContainer from "./containers/ToolsContainer";
import SidebarElement from "../components/sidebarmenu/SidebarElement";
import {mapLayoutValuesSelector} from "../selectors/maplayout";
import tooltip from "../components/misc/enhancers/tooltip";
import {setControlProperty} from "../actions/controls";
import {createPlugin} from "../utils/PluginsUtils";
import sidebarMenuReducer from "../reducers/sidebarmenu";

import './sidebarmenu/sidebarmenu.less';
import {lastActiveToolSelector} from "../selectors/sidebarmenu";
import {setLastActiveItem} from "../actions/sidebarmenu";

const TDropdownButton = tooltip(DropdownButton);

class SidebarMenu extends React.Component {
    static propTypes = {
        className: PropTypes.string,
        style: PropTypes.object,
        items: PropTypes.array,
        id: PropTypes.string,
        mapType: PropTypes.string,
        onInit: PropTypes.func,
        onDetach: PropTypes.func,
        sidebarWidth: PropTypes.number,
        state: PropTypes.object,
        setLastActiveItem: PropTypes.func,
        lastActiveTool: PropTypes.oneOfType([PropTypes.string, PropTypes.bool])
    };

    static contextTypes = {
        messages: PropTypes.object,
        router: PropTypes.object
    };

    static defaultProps = {
        items: [],
        style: {},
        id: "mapstore-sidebar-menu",
        mapType: "openlayers",
        onInit: () => {},
        onDetach: () => {},
        eventSelector: "onClick",
        toolStyle: "default",
        activeStyle: "primary",
        stateSelector: 'sidebarMenu',
        tool: SidebarElement,
        toolCfg: {},
        sidebarWidth: 40
    };

    constructor() {
        super();
        this.defaultTool = SidebarElement;
        this.defaultTarget = 'sidebar';
        this.state = {
            lastVisible: false
        };
    }

    componentDidMount() {
        const { onInit } = this.props;
        onInit();
    }

    shouldComponentUpdate(nextProps) {
        const newSize = nextProps.state.map?.present?.size?.height !== this.props.state.map?.present?.size?.height;
        const newItems = nextProps.items !== this.props.items;
        const newVisibleItems = !newItems ? nextProps.items.reduce((prev, cur, idx) => {
            if (this.isNotHidden(cur) !== this.isNotHidden(this.props.items[idx])) {
                prev.push(cur);
            }
            return prev;
        }, []).length > 0 : false;
        return newSize || newItems || newVisibleItems;
    }

    componentWillUnmount() {
        const { onDetach } = this.props;
        onDetach();
    }

    getStyle = (container = true) => {
        const method = container ? pick : omit;
        return method(this.props.style, ['height']);
    };

    getPanels = items => {
        return items.filter((item) => item.panel)
            .map((item) => assign({}, item, {panel: item.panel === true ? item.plugin : item.panel})).concat(
                items.filter((item) => item.tools).reduce((previous, current) => {
                    return previous.concat(
                        current.tools.map((tool, index) => ({
                            name: current.name + index,
                            panel: tool,
                            cfg: current.cfg.toolsCfg ? current.cfg.toolsCfg[index] : {}
                        }))
                    );
                }, [])
            );
    };

    getItems = (_target, height) => {
        const itemsToRender = Math.floor(height / this.props.sidebarWidth) - 1;
        const target = _target ? _target : this.defaultTarget;
        const targetMatch = (elementTarget) => elementTarget === target || !elementTarget && target === this.defaultTarget;
        const filtered = this.props.items.reduce(( prev, current) => {
            if (!current?.components && targetMatch(current.target)
                && this.isNotHidden(current)
            ) {
                prev.push({
                    ...current,
                    target
                });
                return prev;
            }
            if (current?.components && Array.isArray(current.components)) {
                current.components.forEach((component) => {
                    if (targetMatch(component?.target)
                        && this.isNotHidden(component?.selector ? component : current)
                    ) {
                        prev.push({
                            plugin: current?.plugin || this.defaultTool,
                            position: current?.position,
                            cfg: current?.cfg,
                            name: current.name,
                            help: current?.help,
                            items: current?.items,
                            ...component
                        });
                    }
                    return prev;
                });
            }
            return prev;
        }, []);

        if (itemsToRender < filtered.length) {
            const sorted = filtered.sort((i1, i2) => (i1.position ?? 0) - (i2.position ?? 0));
            this.swapLastActiveItem(sorted, itemsToRender);
            const toRender = sorted.slice(0, itemsToRender);
            const extra = {
                name: "moreItems",
                position: 9999,
                icon: <Glyphicon glyph="option-horizontal" />,
                tool: () => this.renderExtraItems(filtered.slice(itemsToRender)),
                tooltip: 'Show Extras',
                priority: 1
            };
            toRender.splice(itemsToRender, 0, extra);
            return toRender;
        }

        return filtered.sort((i1, i2) => (i1.position ?? 0) - (i2.position ?? 0));
    };

    getTools = (namespace = 'sidebar', height) => {
        return this.getItems(namespace, height).sort((a, b) => a.position - b.position);
    };

    renderExtraItems = (items) => {
        const dummySelector = () => {};
        const menuItems = items.map((item) => {
            const ConnectedItem = connect((item?.selector ?? dummySelector),
                (dispatch, ownProps) => {
                    const actions = {};
                    if (ownProps.action) {
                        actions.onClick = () => {
                            this.props.setLastActiveItem(item?.name ?? item?.toggleProperty);
                            bindActionCreators(ownProps.action, dispatch)();
                        };
                    }
                    return actions;
                })(MenuItem);
            return <ConnectedItem action={item.action}>{item?.icon}{item?.text}</ConnectedItem>;
        });
        return (
            <TDropdownButton
                dropup
                pullRight
                bsStyle="tray"
                id="extra-items"
                tooltip="Show Extras"
                tooltipPosition="left"
                title={<Glyphicon glyph="option-horizontal" />}
            >
                {menuItems}
            </TDropdownButton>);
    };

    render() {
        return (
            <div id="mapstore-sidebar-menu-container" style={this.props.style}>
                <ContainerDimensions>
                    { ({ height }) =>
                        <ToolsContainer id={this.props.id}
                            className={this.props.className}
                            mapType={this.props.mapType}
                            container={(props) => <>{props.children}</>}
                            toolStyle="tray"
                            activeStyle="primary"
                            stateSelector="sidebarMenu"
                            tool={SidebarElement}
                            tools={this.getTools('sidebar', height)}
                            panels={this.getPanels(this.props.items)}
                        /> }
                </ContainerDimensions>
            </div>

        );
    }

    swapLastActiveItem = (items, itemsToRender) => {
        const name = this.props.lastActiveTool;
        if (name) {
            const idx = items.findIndex((el) => el?.name === name || el?.toggleProperty === name);
            if (idx !== -1 && idx > (itemsToRender - 1)) {
                const item = items[idx];
                items[idx] = items[itemsToRender - 1];
                items[itemsToRender - 2] = item;
            }
        }
    }


    isNotHidden = (element) => {
        return element?.selector ? element.selector(this.props.state)?.style?.display !== 'none' : true;
    };
}

const sidebarMenuSelector = createSelector([
    state => state,
    state => lastActiveToolSelector(state),
    state => mapLayoutValuesSelector(state, {bottom: true, height: true})
], (state, lastActiveTool, style) => ({
    style,
    lastActiveTool,
    state
}));

/**
 * Generic bar that can contains other plugins.
 * used by {@link #plugins.Login|Login}, {@link #plugins.Home|Home},
 * {@link #plugins.Login|Login} and many other, on map viewer pages.
 * @name SidebarMenu
 * @class
 * @memberof plugins
 */
export default createPlugin(
    'SidebarMenu',
    {
        cfg: {},
        component: connect(sidebarMenuSelector, {
            onInit: setControlProperty.bind(null, 'sidebarMenu', 'enabled', true),
            onDetach: setControlProperty.bind(null, 'sidebarMenu', 'enabled', false),
            setLastActiveItem
        })(SidebarMenu),
        reducers: {
            sidebarmenu: sidebarMenuReducer
        }
    }
);
