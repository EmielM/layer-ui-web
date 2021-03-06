if (window.Notification) {
  describe('layer-notifier', function() {
    var el, testRoot, client, conversation, message;
    beforeEach(function() {
      client = new layer.Client({
        appId: 'Fred'
      });
      client.user = new layer.Identity({
        client: client,
        userId: 'FrodoTheDodo',
        id: 'layer:///identities/FrodoTheDodo',
        isFullIdentity: true
      });
      client._clientAuthenticated();

      layerUI.init({layer: layer});
      testRoot = document.createElement('div');
      document.body.appendChild(testRoot);
      el = document.createElement('layer-notifier');
      el.client = client;
      testRoot.appendChild(el);
      conversation = client.createConversation({
        participants: ['layer:///identities/FrodoTheDodo']
      });
      message = conversation.createMessage("Hello");
    });
    afterEach(function() {
      document.body.removeChild(testRoot);
    });

    describe('Event Handling', function() {
      it("Should call onMessageNotification when it triggers layer-message-notification", function() {
        var spy = jasmine.createSpy('callback');
        el.onMessageNotification = spy;
        el.trigger('layer-message-notification', {message: message});
        expect(spy).toHaveBeenCalledWith(jasmine.any(CustomEvent));
      });

      it("Should call onNotificationClick when it triggerse layer-notification-click", function() {
        var spy = jasmine.createSpy('callback');
        el.onNotificationClick = spy;
        el.trigger('layer-notification-click', {message: message});
        expect(spy).toHaveBeenCalledWith(jasmine.any(CustomEvent));
      });
    });

    describe("The created() method", function() {
      it("Should setup the avatar, title and container", function() {
        expect(el.nodes.avatar.tagName).toEqual('LAYER-AVATAR');
        expect(el.nodes.title.classList.contains('layer-notifier-title')).toBe(true);
        expect(el.nodes.container.classList.contains('layer-message-item-main')).toBe(true);
      });

      it("Should wire up client messages-notify event", function() {
        var restoreFunc = window.layerUI.isInBackground;
        window.layerUI.isInBackground = jasmine.createSpy('spy');
        client.trigger('messages:notify');
        expect(window.layerUI.isInBackground).toHaveBeenCalled();
        window.layerUI.isInBackground = restoreFunc;
      });

      it("Should wire up the click handler to clickToast", function() {
        spyOn(el, 'onNotificationClick');
        el.props.toastMessage = message;
        el.click();
        expect(el.onNotificationClick).toHaveBeenCalled();
      });
    });

    describe("The onPermissionGranted() method", function() {
      it("Should flag desktop notifications are enabled", function() {
        expect(el.props.userEnabledDesktopNotifications).toBe(false);
        el.onPermissionGranted();
        expect(el.props.userEnabledDesktopNotifications).toBe(true);
      });
    });

    describe("Run with permissions granted", function() {
      beforeEach(function() {
        el.props.userEnabledDesktopNotifications = true;
      });
      describe("The notify() method", function() {
        it("Should use background notification setting if isInBackground returns true", function() {
          spyOn(el, "desktopNotify");
          spyOn(el, "toastNotify");
          var restoreFunc = window.layerUI.isInBackground;
          spyOn(window.layerUI, 'isInBackground').and.returnValue(true);

          // Part 1
          el.notifyInBackground = 'desktop';
          el.notifyInForeground = 'toast';
          el.notify({message: message});
          expect(el.desktopNotify).toHaveBeenCalledWith(message);
          expect(el.toastNotify).not.toHaveBeenCalledWith(message);
          el.desktopNotify.calls.reset();

          // Part 2
          el.notifyInBackground = 'toast';
          el.notifyInForeground = 'desktop';
          el.notify({message: message});
          expect(el.desktopNotify).not.toHaveBeenCalledWith(message);
          expect(el.toastNotify).toHaveBeenCalledWith(message);

          // Cleanup
          window.layerUI.isInBackground = restoreFunc;
        });

        it("Should use foreground notification setting if isInBackground returns false", function() {
          spyOn(el, "desktopNotify");
          spyOn(el, "toastNotify");
          var restoreFunc = window.layerUI.isInBackground;
          spyOn(window.layerUI, 'isInBackground').and.returnValue(false);

          // Part 1
          el.notifyInBackground = 'desktop';
          el.notifyInForeground = 'toast';
          el.notify({message: message});
          expect(el.desktopNotify).not.toHaveBeenCalledWith(message);
          expect(el.toastNotify).toHaveBeenCalledWith(message);
          el.toastNotify.calls.reset();

          // Part 2
          el.notifyInBackground = 'toast';
          el.notifyInForeground = 'desktop';
          el.notify({message: message});
          expect(el.desktopNotify).toHaveBeenCalledWith(message);
          expect(el.toastNotify).not.toHaveBeenCalledWith(message);

          // Cleanup
          window.layerUI.isInBackground = restoreFunc;
        });

        it("Should trigger the layer-message-notification event", function() {
          spyOn(el, "desktopNotify");
          spyOn(el, "toastNotify");
          el.notifyInBackground = 'toast';
          var spy = jasmine.createSpy('onNotify');
          document.body.addEventListener('layer-message-notification', spy);
          var restoreFunc = window.layerUI.isInBackground;
          spyOn(window.layerUI, 'isInBackground').and.returnValue(true);

          // Run
          el.notify({message: message});

          // Posttest
          expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
            detail: {
              type: 'toast',
              isBackground: true,
              message: message
            }
          }));

          // Cleanup
          window.layerUI.isInBackground = restoreFunc;
        });

        it("Should prevent handling if evt.preventDefault is called", function() {
          spyOn(el, "desktopNotify");
          spyOn(el, "toastNotify");
          var restoreFunc = window.layerUI.isInBackground;
          spyOn(window.layerUI, 'isInBackground').and.returnValue(true);
          el.notifyInBackground = 'desktop';
          el.notifyInForeground = 'desktop';
          document.body.addEventListener('layer-message-notification', function(evt) {
            evt.preventDefault();
          });

          // Run
          el.notify({message: message});

          // Posttest
          expect(el.desktopNotify).not.toHaveBeenCalledWith(message);
          expect(el.toastNotify).not.toHaveBeenCalledWith(message);

          // Cleanup
          window.layerUI.isInBackground = restoreFunc;
        });

        it("Should do nothing if desktop notification is configured and permissions not granted", function() {
          spyOn(el, "desktopNotify");
          spyOn(el, "toastNotify");
          var restoreFunc = window.layerUI.isInBackground;
          spyOn(window.layerUI, 'isInBackground').and.returnValue(true);
          el.notifyInBackground = 'desktop';
          el.notifyInForeground = 'desktop';
          el.props.userEnabledDesktopNotifications = false;

          // Run
          el.notify({message: message});

          // Posttest
          expect(el.desktopNotify).not.toHaveBeenCalledWith(message);
          expect(el.toastNotify).not.toHaveBeenCalledWith(message);

          // Cleanup
          window.layerUI.isInBackground = restoreFunc;
        });
      });

      describe("The desktopNotify() method", function() {
        it("Should calls closeDesktopNotify if needed", function() {
          spyOn(el, "closeDesktopNotify");
          expect(Boolean(el.props.desktopNotify)).toBe(false);

          // Run 1
          el.desktopNotify(message);
          expect(el.closeDesktopNotify).not.toHaveBeenCalled();
          expect(Boolean(el.props.desktopNotify)).toBe(true);

          // Run 2
          el.desktopNotify(message);
          expect(el.closeDesktopNotify).toHaveBeenCalled();
        });

        it("Should set desktopMessage and desktopNotify", function() {
          expect(Boolean(el.props.desktopNotify)).toBe(false);
          expect(Boolean(el.props.desktopMessage)).toBe(false);

          // Run
          el.desktopNotify(message);

          // Posttest
          expect(Boolean(el.props.desktopNotify)).toBe(true);
          expect(el.props.desktopMessage).toBe(message);
        });

        it("Should listen for the message to be read and call closeDesktopNotify", function() {
          spyOn(el, "closeDesktopNotify");
          message.isRead = false;

          // Run
          el.desktopNotify(message);
          expect(el.closeDesktopNotify).not.toHaveBeenCalled();
          message.trigger('messages:change', {});
          expect(el.closeDesktopNotify).not.toHaveBeenCalled();
          message.isRead = true;
          message.trigger('messages:change', {});
          expect(el.closeDesktopNotify).toHaveBeenCalled();
        });
      });

      describe("The closeDesktopNotify() method", function() {
        it("Should set desktopMessage and desktopNotify to null", function() {
          el.props.desktopMessage = message;
          var spy = jasmine.createSpy('close');
          el.props.desktopNotify = {
            close: spy
          };

          // Run
          el.closeDesktopNotify();

          // Posttest
          expect(el.props.desktopMessage).toBe(null);
          expect(el.props.desktopNotify).toBe(null);
          expect(spy).toHaveBeenCalled();
        });
      });

      describe("The toastNotify() method", function() {
        it("Should set the avatar users", function() {
          expect(el.nodes.avatar.users).toEqual([]);
          el.toastNotify(message);
          expect(el.nodes.avatar.users).toEqual([message.sender]);
        });

        it("Should set the title", function() {
          expect(el.nodes.title.innerHTML).toEqual('');
          el.toastNotify(message);
          expect(el.nodes.title.innerHTML.indexOf(message.sender.displayName)).not.toEqual(-1);
        });

        it("Should generate a layer-message-text-plain content", function() {
          expect(el.querySelectorAllArray('layer-message-text-plain').length).toEqual(0);
          el.toastNotify(message);
          expect(el.querySelectorAllArray('layer-message-text-plain').length).toEqual(1);
        });

        it("Should replace the layer-message-text-plain content", function() {
          expect(el.querySelectorAllArray('layer-message-text-plain').length).toEqual(0);
          el.toastNotify(message);
          el.toastNotify(conversation.createMessage("test 2"));
          el.toastNotify(conversation.createMessage("test 3"));
          el.toastNotify(conversation.createMessage("test 4"));
          expect(el.querySelectorAllArray('layer-message-text-plain').length).toEqual(1);

        });

        it("Should listen for the message to be read and call clearToast", function() {
          spyOn(el, "clearToast");
          message.isRead = false;

          // Run
          el.toastNotify(message);
          expect(el.clearToast).not.toHaveBeenCalled();
          message.trigger('messages:change', {});
          expect(el.clearToast).not.toHaveBeenCalled();
          message.isRead = true;
          message.trigger('messages:change', {});
          expect(el.clearToast).toHaveBeenCalled();
        });

        it("Should add the layer-notifier-toast css class", function() {
          expect(el.classList.contains('layer-notifier-toast')).toBe(false);
          el.toastNotify(message);
          expect(el.classList.contains('layer-notifier-toast')).toBe(true);
        });
      });

      describe("The clearToast() method", function() {
        it("Should clear the layer-notifier-toast css class", function() {
          el.classList.add('layer-notifier-toast');
          el.clearToast();
          expect(el.classList.contains('layer-notifier-toast')).toBe(false);
        });

        it("Should no longer listen for the message to be read and call clearToast", function() {
          message.isRead = false;

          // Run
          el.clearToast();

          // Posttest
          spyOn(el, "clearToast");
          el.toastNotify(message);
          expect(el.clearToast).not.toHaveBeenCalled();
          message.trigger('messages:change', {});
          expect(el.clearToast).not.toHaveBeenCalled();
          message.isRead = true;
          message.trigger('messages:change', {});
          expect(el.clearToast).toHaveBeenCalled();
        });

        it("Should clear timeouts", function() {
          el.props.toastTimeout = 5;
          el.clearToast();
          expect(el.props.toastTimeout).toEqual(0);
        });
      });

      describe("The clickToast() method", function() {
        beforeEach(function() {
          el.props.toastMessage = message;
        });
        it("Should prevent bubbling", function() {
          var preventDefaultSpy = jasmine.createSpy('preventDefault');
          var stopPropagationSpy = jasmine.createSpy('stopPropagation');

          // Run
          el.clickToast({
            preventDefault: preventDefaultSpy,
            stopPropagation: stopPropagationSpy
          });

          // Posttest
          expect(preventDefaultSpy).toHaveBeenCalled();
          expect(stopPropagationSpy).toHaveBeenCalled();
        });

        it("Should trigger layer-notification-click", function() {
          var spy1 = jasmine.createSpy('spy1');
          document.body.addEventListener('layer-notification-click', spy1);

          // Run
          el.click();

          // Posttest
          expect(spy1).toHaveBeenCalledWith(jasmine.objectContaining({
            detail: {
              message: message
            }
          }));
        });
      });
    });
  });
}