'use strict';
var layerUI = require('../base');
var libraryResult;

/**
 * Call this function to initialize all of the Backbone Views needed to handle the Layer UI for Web widgets.
 *
 * Initialize this adapter using:
 *
 * ```javascript
 * var Backbone = require('backbone');
 * var LayerUIViews = layerUI.adapters.backbone(Backbone);
 * var ConversationView = new LayerUIViews.Conversation(client);
 * var ConversationListView = new LayerUIViews.ConversationList(client);
 * var UserListView = new LayerUIViews.UserList(client);
 * var NotifierView = new LayerUIViews.Notifier(client, {notifyInForeground: 'toast'});
 * ```
 *
 * Any occurances of a layer widget in your html should be associated with these views:
 *
 * ```html
 * <!-- Associated with the NotifierView -->
 * <layer-notifier notify-in-foreground="toast"></layer-notifier>
 *
 * <!-- Associated with the ConversationView -->
 * <layer-conversation conversation-id="layer:///conversations/UUID"></layer-conversation>
 * ```
 *
 * @class layerUI.adapters.backbone
 * @singleton
 * @param {Object} backbone     Pass in the backbone library
 */
function initBackbone(backbone) {
  if (libraryResult) return libraryResult;
  libraryResult = {};

  // Gather all UI Components flagged as Main Components; other components don't require special wrappers that allow properties
  // embedded in Angular's Templates to correctly handle values.
  Object.keys(layerUI.components).filter(function(componentName) {
    var component = layerUI.components[componentName];
    return component.properties.filter(function(prop) {
      return prop.propertyName === 'isMainComponent';
    }).length;
  }).forEach(function(componentName) {
    var component = layerUI.components[componentName];

    // Get the camel case Component name
    var className = (componentName.substring(0, 1).toUpperCase() + componentName.substring(1).replace(/-(.)/g, function(str, value) {
      return value.toUpperCase();
    })).replace(/^Layer/, '');

    // Define the Backbone View
    var view = libraryResult[className] = backbone.View.extend({
      el: componentName,
      initialize: function(client, options) {
        this.client = client;
        Object.keys(options || {}).forEach(function(propertyName) {
          this[propertyName] = options[propertyName];
        }, this);
      }
    });

    // Define getters/setters so that the View acts as though it were the WebComponent it wraps
    component.properties.forEach(function(propertyDef) {
      Object.defineProperty(view.prototype, propertyDef.propertyName, {
        set: function(value) {
          this.$el[0][propertyDef.propertyName] = value;
        },
        get: function() {
          return this.$el[0][propertyDef.propertyName];
        }
      });
    });
  });
  return libraryResult;
};

module.exports = initBackbone;
layerUI.addAdapter('backbone', initBackbone);
