describe('layer-messages-list', function() {
  var el, testRoot, client, conversation, query, user1;


  beforeEach(function() {
    jasmine.clock().install();

    client = new layer.Client({
      appId: 'layer:///apps/staging/Fred'
    });
    client.user = new layer.Identity({
      client: client,
      userId: 'FrodoTheDodo',
      displayName: 'Frodo the Dodo',
      id: 'layer:///identities/FrodoTheDodo',
      isFullIdentity: true,
      sessionOwner: true
    });
    client._clientAuthenticated();
    conversation = client.createConversation({
      participants: ['layer:///identities/FrodoTheDodo', 'layer:///identities/SaurumanTheMildlyAged']
    });

    layerUI.init({layer: layer});
    testRoot = document.createElement('div');
    document.body.appendChild(testRoot);
    el = document.createElement('layer-messages-list');
    testRoot.appendChild(el);
    testRoot.style.display = 'flex';
    testRoot.style.flexDirection = 'column';
    testRoot.style.height = '300px';
    query = client.createQuery({
      model: layer.Query.Message,
      predicate: 'conversation.id = "' + conversation.id + '"'
    });
    query.isFiring = false;
    for (i = 0; i < 100; i++) {
      query.data.push(conversation.createMessage("m " + i).send());
    }

    user1 = new layer.Identity({
      client: client,
      userId: 'SaurumanTheMildlyAged',
      displayName: 'Sauruman the Mildly Aged',
      id: 'layer:///identities/SaurumanTheMildlyAged',
      isFullIdentity: true
    });

    el.query = query;
    el.style.height = '300px';

    jasmine.clock().tick(500);
  });

  afterEach(function() {
    document.body.removeChild(testRoot);
    jasmine.clock().uninstall();
  });

  describe('The created() method', function() {
    beforeEach(function() {
      el = document.createElement('layer-messages-list');
      testRoot.innerHTML = '';
      testRoot.appendChild(el);
    });
    it("Should initialize lastPagedAt", function() {
      expect(el.props.lastPagedAt).toEqual(0);
    });

    it("Should initialize isSelfScrolling", function() {
      expect(el.props.isSelfScrolling).toEqual(false);
    });

    it("Should initialize stuckToBottom", function() {
      expect(el.props.stuckToBottom).toEqual(true);
    });

    it("Should initialize lastScroll", function() {
      expect(el.props.lastScroll).toEqual(0);
    });

    it("Should call render", function() {
      expect(el.nodes.loadIndicator.classList.contains('layer-load-indicator')).toBe(true);
    });

    it("Should wire up checkVisibility to the focus event", function() {
      query.data[0].isRead = false;
      query.data[query.size - 1].isRead = false;
      el.props.stuckToBottom = false;
      el.scrollTop = 0;
      spyOn(el, "markAsRead");
      var tmp = window.layerUI.isInBackground;
      window.layerUI.isInBackground = function() {return false;}
      el.query = query;
      jasmine.clock().tick(150);

      // Run
      evt = new CustomEvent('focus', {});
      window.dispatchEvent(evt);
      jasmine.clock().tick(3000);

      // Posttest
      expect(el.markAsRead).toHaveBeenCalled();

      // Cleanup
      window.layerUI.isInBackground = tmp;
    });
  });

  describe("The destroyed() method", function() {
    it("Should unwire checkVisibility from the focus event", function() {
      query.data[0].isRead = false;
      spyOn(el, "markAsRead");
      var tmp = window.layerUI.isInBackground;
      window.layerUI.isInBackground = function() {return false;}
      el.query = query;
      jasmine.clock().tick(150);
      el.destroyed();

      // Run
      evt = new CustomEvent('focus', {});
      window.dispatchEvent(evt);
      jasmine.clock().tick(3000);

      // Posttest
      expect(el.markAsRead).not.toHaveBeenCalled();

      // Cleanup
      window.layerUI.isInBackground = tmp;
    });

  });


  describe("The shouldPage() method", function() {
    it("Should return true if scrolled to the top", function() {
      el.scrollTop = 0;
      el.isDataLoading = false;
      expect(el.shouldPage()).toBe(true);
    });

    it("Should return false if data is loading", function() {
      el.isDataLoading = true;
      expect(el.shouldPage()).toBe(false);
    });

    it("Should return false if more than half a page from the top", function() {
      el.screenFullsBeforePaging = 0.5;
      el.scrollTop = 160;
      el.isDataLoading = false;
      expect(el.shouldPage()).toBe(false);
    });

    it("Should return true if less than half a page from the top", function() {
      el.screenFullsBeforePaging = 0.5;
      el.scrollTop = 140;
      el.isDataLoading = false;
      expect(el.shouldPage()).toBe(true);
    });
  });

  describe("The handleScroll() method", function() {
    it("Should page the query if shouldPage and if its userScrolled and we arent in the middle of a delayedPagingTimeout and we didn't just fire the query and the query isnt already firing", function() {
      spyOn(query, 'update');
      spyOn(el, 'shouldPage').and.returnValue(true);
      el.props.isSelfScrolling = false;
      el.props.lastScroll = 0;
      el.props.delayedPagingTimeout = 0;
      el.props.lastPagedAt = 0;
      query.isFiring = false;

      el.handleScroll();
      expect(query.update).toHaveBeenCalledWith({paginationWindow: jasmine.any(Number)});
      query.update.calls.reset();


      query.isFiring = true;
      el.handleScroll();
      expect(query.update).not.toHaveBeenCalled();
      query.isFiring = false;

      el.props.delayedPagingTimeout = 1;
      el.handleScroll();
      expect(query.update).not.toHaveBeenCalled();
      el.props.delayedPagingTimeout = 0;

      el.props.isSelfScrolling = true;
      el.handleScroll();
      expect(query.update).not.toHaveBeenCalled();
      el.props.isSelfScrolling = false;

      el.props.isSelfScrolling = true;
      el.props.lastScroll = el.scrollTop + 1;
      el.handleScroll();
      expect(query.update).toHaveBeenCalledWith({paginationWindow: jasmine.any(Number)});
      el.props.lastScroll = 0;
      el.props.isSelfScrolling = false;
      query.update.calls.reset();

      el.props.lastPagedAt = Date.now();
      el.handleScroll();
      expect(query.update).not.toHaveBeenCalled();
      el.props.lastPagedAt = 0;

      el.props.delayedPagingTimeout = 0;
      el.handleScroll();
      expect(query.update).toHaveBeenCalledWith({paginationWindow: jasmine.any(Number)});
    });

    it("Should schedule a query update", function() {
      spyOn(query, 'update');
      spyOn(el, 'shouldPage').and.returnValue(true);
      el.props.isSelfScrolling = false;
      el.props.lastScroll = 0;
      el.props.delayedPagingTimeout = 0;
      el.props.lastPagedAt = Date.now() - 500;
      query.isFiring = false;

      el.handleScroll();
      expect(query.update).not.toHaveBeenCalled();
      el.handleScroll();
      el.handleScroll();
      jasmine.clock().tick(2000);
      expect(query.update).toHaveBeenCalledWith({paginationWindow: jasmine.any(Number)});
      expect(query.update.calls.count()).toEqual(1);
    });

    it("Should enable stuckToBottom if user scrolls to bottom", function() {
      el.props.stuckToBottom = false;
      el.scrollTop = 100000;
      el.handleScroll();
      expect(el.props.stuckToBottom).toBe(true);
    });

    it("Should check visibility after scrolling", function() {
      spyOn(el, "checkVisibility");
      el.handleScroll();
      expect(el.checkVisibility).toHaveBeenCalledWith();
    });
  });

  describe("The scrollTo() method", function() {
    it("Should scroll to the specified position", function() {
      el.scrollTo(55);
      expect(el.scrollTop).toEqual(55);
    });

    it("Should check for visibility", function() {
      spyOn(el, "checkVisibility");
      el.scrollTo(55);
      jasmine.clock().tick(500);
      expect(el.checkVisibility).toHaveBeenCalledWith();
    });

    it("Should not cause paging of the query", function() {
      spyOn(query, "update");
      el.scrollTo(55);
      jasmine.clock().tick(500);
      expect(query.update).not.toHaveBeenCalled();
    });
  });

  describe("The animateScrollTo() method", function() {
    beforeEach(function() {
      jasmine.clock().uninstall();
    });

    it("Should scroll to the specified position", function(done) {
      el.animateScrollTo(55);
      setTimeout(function() {
        expect(el.scrollTop).toEqual(55);
        done();
      }, 1000);
    });

    it("Should check for visibility", function(done) {
      spyOn(el, "checkVisibility");
      el.animateScrollTo(55);
      setTimeout(function() {
        expect(el.checkVisibility).toHaveBeenCalledWith();
        done();
      }, 1000);
    });

    it("Should not cause paging of the query", function(done) {
      spyOn(query, "update");
      el.animateScrollTo(55);
      setTimeout(function() {
        expect(query.update).not.toHaveBeenCalled();
        done();
      }, 1000);
    });
  });

  describe("The checkVisibility() method", function() {
    var restoreFunc = window.layerUI.isInBackground;
    beforeEach(function() {
      query.data.forEach(function(message) {
        message.isRead = false;
      });
      window.layerUI.isInBackground = function() {return false;};
    });

    afterEach(function() {
      window.layerUI.isInBackground = restoreFunc;
    });

    it("Should mark visible messages as read", function() {
      el.scrollTo(0);
      el.checkVisibility();
      jasmine.clock().tick(10000);
      var items = el.querySelectorAllArray('layer-message-item');
      items.forEach(function(messageRow) {
        expect(messageRow.item.isRead).toBe(messageRow.offsetTop + messageRow.clientHeight < el.clientHeight + el.offsetTop);
      });
    });

    it("Should mark visible messages as read part 2", function() {
      el.scrollTo(100);
      jasmine.clock().tick(10000);
      var items = el.querySelectorAllArray('layer-message-item');
      items.forEach(function(messageRow) {
        if (messageRow.offsetTop - el.offsetTop < el.scrollTop) {
          expect(messageRow.item.isRead).toBe(false);
        } else if (messageRow.offsetTop + messageRow.clientHeight < el.clientHeight + el.offsetTop + el.scrollTop) {
          expect(messageRow.item.isRead).toBe(true);
        } else {
          expect(messageRow.item.isRead).toBe(false);
        }
      });
    });


    it("Should mark visible messages as read part 3", function() {
      el.scrollTo(10000);
      jasmine.clock().tick(10000);
      var items = el.querySelectorAllArray('layer-message-item');
      items.forEach(function(messageRow) {
        if (messageRow.offsetTop - el.offsetTop < el.scrollTop) {
          expect(messageRow.item.isRead).toBe(false);
        } else if (messageRow.offsetTop + messageRow.clientHeight <= el.clientHeight + el.offsetTop + el.scrollTop) {
          expect(messageRow.item.isRead).toBe(true);
        } else {
          expect(messageRow.item.isRead).toBe(false);
        }
      });
    });
  });

  describe("The markAsRead() method", function() {
    it("Should mark the first message as read", function() {
      el.childNodes[1].item.isRead = false;
      el.scrollTop = 0;
      el.markAsRead(el.childNodes[1]);
      expect(el.childNodes[1].item.isRead).toBe(true);
    });

    it("Should not mark the first message as read if scrolled partially out of view", function() {
      el.childNodes[1].item.isRead = false;
      el.scrollTop = 40;
      el.markAsRead(el.childNodes[1]);
      expect(el.childNodes[1].item.isRead).toBe(false);
    });

    it("Should  mark the 50th message as read if scrolled into view", function() {
      el.childNodes[50].item.isRead = false;
      el.scrollTop = el.childNodes[50].offsetTop - el.offsetTop - 50;
      el.markAsRead(el.childNodes[50]);
      expect(el.childNodes[50].item.isRead).toBe(true);
    });

    it("Should  mark the 50th message as read if scrolled above the item", function() {
      el.childNodes[50].item.isRead = false;
      el.scrollTop = 0;
      el.markAsRead(el.childNodes[50]);
      expect(el.childNodes[50].item.isRead).toBe(false);
    });

    it("Should  mark the 50th message as read if scrolled below the item", function() {
      el.childNodes[50].item.isRead = false;
      el.scrollTop = el.childNodes[50].offsetTop + el.scrollHeight;
      el.markAsRead(el.childNodes[50]);
      expect(el.childNodes[50].item.isRead).toBe(false);
    });
  });

  describe("The generateItem() method", function() {
    it("Should return a layer-message-item", function() {
      var m = conversation.createMessage("m?");
      expect(el.generateItem(m).tagName).toEqual('LAYER-MESSAGE-ITEM');
    });

    it("Should set a suitable contentTag", function() {
      var handlers = window.layerUI.handlers;
      window.layerUI.handlers = [
        {
          handlesMessage: jasmine.createSpy('handlesNo').and.returnValue(false),
          tagName: "frodo-dom"
        },
        {
          handlesMessage: jasmine.createSpy('handlesYes').and.returnValue(true),
          tagName: "sauron-dom"
        }
      ];
      var m = conversation.createMessage("m?");
      expect(el.generateItem(m).contentTag).toEqual('sauron-dom');
      window.layerUI.handlers = handlers;
    });

    it("Should setup dateRenderer and messageStatusRenderer", function() {
      var dateRenderer = jasmine.createSpy('dateRenderer');
      var messageStatusRenderer = jasmine.createSpy('messageStatusRenderer');
      el.dateRenderer = dateRenderer;
      el.messageStatusRenderer = messageStatusRenderer;

      var m = conversation.createMessage("m?");
      var item = el.generateItem(m);
      expect(item.dateRenderer).toBe(dateRenderer);
      expect(item.messageStatusRenderer).toBe(messageStatusRenderer);
    });

    it("Should return layer-message-unknown if no handlers", function() {
      var m = conversation.createMessage({
        parts: {
          body: "m?",
          mimeType: "not/handled"
        }
      });

      var generatedItem = el.generateItem(m);
      expect(generatedItem.tagName).toEqual('LAYER-MESSAGE-ITEM');
      generatedItem.item = m;
      expect(generatedItem.nodes.content.firstChild.tagName).toEqual('LAYER-MESSAGE-UNKNOWN');
    });
  });

  describe("The inSameGroup() method", function() {
    it("Should return true if same sender and within layerUI.settings.messageGroupTimeSpan seconds", function() {
      var m1 = conversation.createMessage("m1");
      var m2 = conversation.createMessage("m1");
      m1.sentAt = new Date();
      m2.sentAt = new Date();
      m2.sentAt.setSeconds(m2.sentAt.getSeconds() + layerUI.settings.messageGroupTimeSpan/1000 - 1);
      expect(el.inSameGroup(m1, m2)).toBe(true);
    });

    it("Should return false if the senders do not match", function() {
      var m1 = conversation.createMessage("m1");
      var m2 = conversation.createMessage("m2");
      m1.sentAt = new Date();
      m2.sentAt = new Date();
      m2.sender = user1;
      expect(el.inSameGroup(m1, m2)).toBe(false);
    });

    it("Should return false if outside of layerUI.settings.messageGroupTimeSpan seconds", function() {
      var m1 = conversation.createMessage("m1");
      var m2 = conversation.createMessage("m1");
      m1.sentAt = new Date();
      m2.sentAt = new Date();
      m2.sentAt.setSeconds(m2.sentAt.getSeconds() + layerUI.settings.messageGroupTimeSpan/1000 + 10);
      expect(el.inSameGroup(m1, m2)).toBe(false);
    });
  });

  describe("The _processAffectedWidgets() method", function() {
    var m1, m2, m3, m4, m5;
    beforeEach(function() {
      m1 = el.childNodes[50];
      m2 = el.childNodes[51];
      m3 = el.childNodes[52];
      m4 = el.childNodes[53];
      m5 = el.childNodes[54];
      m1.firstInSeries = m1.lastInSeries = false;
      m2.firstInSeries = m2.lastInSeries = false;
      m3.firstInSeries = m3.lastInSeries = false;
      m4.firstInSeries = m4.lastInSeries = false;
      m5.firstInSeries = m5.lastInSeries = false;
    });

    it("Should set firstInSeries for the first item is isTopItemNew", function() {
      el._processAffectedWidgets([m1, m2, m3, m4, m5], true);
      expect(m1.firstInSeries).toBe(true);
    });

    it("Should not set firstInSeries for the first item is not isTopItemNew", function() {
      el._processAffectedWidgets([m1, m2, m3, m4, m5], false);
      expect(m1.firstInSeries).toBe(false);
    });

    it("Should nto set lastInSeries for any item having a nextSibling", function() {
      el._processAffectedWidgets([m1, m2, m3, m4, m5], false);
      expect(m1.lastInSeries).toBe(false);
    });

    it("Should set lastInSeries for any item lacking a nextSibling", function() {
      while (el.childNodes[55]) el.removeChild(el.childNodes[55]);
      el._processAffectedWidgets([m1, m2, m3, m4, m5], false);
      expect(m5.lastInSeries).toBe(true);
    });

    it("Should set lastInSeries for any item that is not in the same group as the next item", function() {
      m3.item.sender = user1;
      m4.item.sender = user1;
      el._processAffectedWidgets([m1, m2, m3, m4, m5], false);
      expect(m1.lastInSeries).toBe(false);
      expect(m2.lastInSeries).toBe(true);
      expect(m3.lastInSeries).toBe(false);
      expect(m4.lastInSeries).toBe(true);
      expect(m5.lastInSeries).toBe(false);
    });

    it("Should set firstInSeries for any item following an item that is not in the same group", function() {
      m3.item.sender = user1;
      el._processAffectedWidgets([m1, m2, m3, m4, m5], false);
      expect(m1.firstInSeries).toBe(false);
      expect(m2.firstInSeries).toBe(false);
      expect(m3.firstInSeries).toBe(true);
      expect(m4.firstInSeries).toBe(true);
      expect(m5.firstInSeries).toBe(false);
    });
  });

  describe("The rerender() method", function() {
    it("Should call _rerender", function() {
      spyOn(el, "_rerender");
      var evt = {hey: "ho"};
      el.rerender(evt);
      expect(el._rerender).toHaveBeenCalledWith(evt);
    });
  });

  describe("The renderResetData() method", function() {
    it("Should reset listData", function() {
      el.props.listData = query.data;
      query.reset();
      expect(el.props.listData.length).toEqual(0);
      expect(query.data).not.toBe(el.props.listData);
    });

    it("Should reset the scroll position", function() {
      el.scrollTop = 100;
      expect(el.scrollTop > 0).toBe(true);
      query.reset();
      expect(el.scrollTop > 0).toBe(false);
    });

    it("Should empty the list of items, but still contain a loadingIndicator node", function() {
      el.render();
      jasmine.clock().tick(150);
      expect(el.childNodes.length > 1).toBe(true);
      query.reset();
      expect(el.childNodes.length > 1).toBe(false);
      expect(el.firstChild.classList.contains('layer-load-indicator')).toBe(true);
    });

    it("Should reset assorted state", function() {
      el.props.stuckToBottom = false;
      el.props.lastPagedAt = 5;
      el.props.isSelfScrolling = true;
      el.props.lastScroll = 5;
      query.reset();
      expect(el.props.stuckToBottom).toEqual(true);
      expect(el.props.lastPagedAt).toEqual(0);
      expect(el.props.isSelfScrolling).toEqual(false);
      expect(el.props.lastScroll).toEqual(0);
    });
  });


  describe("The renderWithoutRemovedData() method", function() {
    it("Should update listData", function() {
      var queryData = query.data.reverse();
      var initialLength = query.data.length;
      expect(initialLength).toEqual(el.props.listData.length);

      expect(el.props.listData).toEqual(queryData);
      expect(el.props.listData).not.toBe(queryData);
      spyOn(el, 'renderWithoutRemovedData').and.callThrough();

      // Run
      queryData[5].destroy();
      jasmine.clock().tick(1);
      queryData = query.data.reverse();

      // Posttest
      expect(el.renderWithoutRemovedData).toHaveBeenCalled();
      expect(el.props.listData).toEqual(queryData);
      expect(el.props.listData).not.toBe(query.data);
      expect(initialLength).toEqual(el.props.listData.length + 1);
    });

    it("Should call _gatherAndProcessAffectedItems with 3 items before and 3 after the removed item", function() {
      spyOn(el, "_gatherAndProcessAffectedItems");
      var queryData = [].concat(query.data).reverse();

      // Run
      queryData[5].destroy();
      jasmine.clock().tick(1);

      // Posttest
      expect(el._gatherAndProcessAffectedItems).toHaveBeenCalledWith([
        queryData[2],
        queryData[3],
        queryData[4],
        queryData[6],
        queryData[7],
        queryData[8]], false);
    });

    it("Should remove the item from the list", function() {
      var queryData = [].concat(query.data).reverse();
      var mid5 = queryData[5].id;
      var midNext = queryData[6].id;
      expect(el.childNodes[6].item.id).toEqual(mid5);

      // Run
      queryData[5].destroy();
      jasmine.clock().tick(1);

      // Posttest
      expect(el.childNodes[6].item.id).toEqual(midNext);
    });
  });

  describe("The renderInsertedData() method", function() {
    it("Should update listData", function() {
      var message = conversation.createMessage("What the???");
      message.position = conversation.lastMessage.position + 1;
      query._handleMessageAddEvent({
        messages: [
          message
        ]
      });

      // Posttest
      expect(el.props.listData[el.props.listData.length - 1]).toBe(message);
    });

    it("Should insert a list item at the proper index", function() {
      var message = conversation.createMessage("What the???");
      query.data.splice(20, 0, message);
      query._triggerChange({
        type: 'insert',
        index: 20,
        target: message,
        query: query
      });

      // Posttest
      var newElement = el.querySelector('#' + el.getItemId(message));
      expect(newElement.item).toBe(message);
      expect(newElement).toBe(el.childNodes[80 + 1]); // + 1 for loadingIndicator
    });

    it("Should call _gatherAndProcessAffectedItems on 3 items before and 3 items after the inserted item", function() {
      spyOn(el, "_gatherAndProcessAffectedItems");
      var message = conversation.createMessage("What the???");
      var queryData = [].concat(query.data).reverse();

      // Run
      query.data.splice(20, 0, message);
      query._triggerChange({
        type: 'insert',
        index: 20,
        target: message,
        query: query
      });
      var queryData = [].concat(query.data).reverse();

      // Posttest
      expect(el._gatherAndProcessAffectedItems).toHaveBeenCalledWith([
        queryData[80-3],
        queryData[80-2],
        queryData[80-1],
        queryData[80],
        queryData[80+1],
        queryData[80+2],
        queryData[80+3]
      ], false);
    });

    it("Should call _gatherAndProcessAffectedItems with isTopNewItem as false if index < last", function() {
      spyOn(el, "_gatherAndProcessAffectedItems");
      var message = conversation.createMessage("What the???");
      var queryData = [].concat(query.data).reverse();

      // Run
      query.data.splice(20, 0, message);
      query._triggerChange({
        type: 'insert',
        index: 20,
        target: message,
        query: query
      });
      var queryData = [].concat(query.data).reverse();

      // Posttest
      expect(el._gatherAndProcessAffectedItems).toHaveBeenCalledWith([
        queryData[80-3],
        queryData[80-2],
        queryData[80-1],
        queryData[80],
        queryData[80+1],
        queryData[80+2],
        queryData[80+3]
      ], false);
    });

    it("Should call _gatherAndProcessAffectedItems with isTopNewItem as true if index === last", function() {
      spyOn(el, "_gatherAndProcessAffectedItems");
      var message = conversation.createMessage("What the???");
      var queryData = [].concat(query.data).reverse();

      // Run
      query.data.push(message);
      query._triggerChange({
        type: 'insert',
        index: query.data.length - 1,
        target: message,
        query: query
      });
      queryData = [].concat(query.data).reverse();

      // Posttest
      expect(el._gatherAndProcessAffectedItems).toHaveBeenCalledWith([
        queryData[0],
        queryData[1],
        queryData[2],
        queryData[3]
      ], true);
    });

    it("Should call updateLastMessageSent", function() {
      var message = conversation.createMessage("What the???");
      spyOn(el, "updateLastMessageSent");

      // Run
      query.data.push(message);
      query._triggerChange({
        type: 'insert',
        index: query.data.length - 1,
        target: message,
        query: query
      });

      // Posttest
      expect(el.updateLastMessageSent).toHaveBeenCalledWith();
    });

    it("Should scroll to bottom if stuck to bottom and new item is bottom", function() {
      var message = conversation.createMessage("What the???");
      el.props.stuckToBottom = true;
      spyOn(el, "animateScrollTo");
      // Run
      query.data.push(message);
      query._triggerChange({
        type: 'insert',
        index: query.data.length - 1,
        target: message,
        query: query
      });

      // Posttest
      expect(el.animateScrollTo).toHaveBeenCalledWith(el.scrollHeight - el.clientHeight);
    });

    it("Should checkVisibility rather than scroll if not stuck to bottom", function() {
      var message = conversation.createMessage("What the???");
      spyOn(el, "checkVisibility");
      el.props.stuckToBottom = false;
      el.scrollTop = 10;

      // Run
      query.data.push(message);
      query._triggerChange({
        type: 'insert',
        index: query.data.length - 1,
        target: message,
        query: query
      });

      // Posttest
      expect(el.scrollTop).toEqual(10);
      expect(el.checkVisibility).toHaveBeenCalledWith();
    });
  });

  describe("The updateLastMessageSent() method", function() {
    it("Should insure only the last message sent has this class set", function() {
      query.data[0].sender = user1;
      el.render();
      jasmine.clock().tick(150);

      el.querySelectorAllArray('.layer-last-message-sent').forEach(function(node) {
        node.classList.remove('layer-last-message-sent');
      });
      expect(el.querySelectorAllArray('.layer-last-message-sent')).toEqual([]);
      el.childNodes[50].classList.add('layer-last-message-sent');

      // Run
      el.updateLastMessageSent();

      // Posttest
      expect(el.querySelectorAllArray('.layer-last-message-sent')).toEqual([el.childNodes[el.childNodes.length - 2]]);
    });
  });

  describe("The findFirstVisibleItem() method", function() {
    it("Should return first item", function() {
      el.scrollTop = 0;
      expect(el.findFirstVisibleItem()).toBe(el.childNodes[1]);
    });

    it("Should return second item", function() {
      el.scrollTo(el.childNodes[1].clientHeight + el.childNodes[0].clientHeight);
      expect(el.findFirstVisibleItem()).toBe(el.childNodes[2]);
    });

    it("Should return third item", function() {
      el.scrollTo(el.childNodes[2].clientHeight + el.childNodes[1].clientHeight + el.childNodes[0].clientHeight);
      expect(el.findFirstVisibleItem()).toBe(el.childNodes[3]);
    });
  });

  describe("The renderPagedData() method", function() {
    it("Should update lastPagedAt and listData", function() {
      el.props.lastPagedAt = 0;
      var messages = [conversation.createMessage("mm 0"), conversation.createMessage("mm 1")];
      expect(el.props.listData.length).toEqual(100);
      query.data.push(messages[1]);
      query.data.push(messages[0]);
      el.renderPagedData({type: 'data', data: messages});
      jasmine.clock().tick(1000);
      expect(el.props.lastPagedAt > 0).toBe(true);
      expect(el.props.listData.length).toEqual(102);
    });

    it("Should call renderPagedDataDone with top 3 items and two new items", function() {
      spyOn(el, "renderPagedDataDone");
      var messages = [conversation.createMessage("mm 0"), conversation.createMessage("mm 1")];
      var affectedItems = [messages[1], messages[0], el.childNodes[1].item, el.childNodes[2].item, el.childNodes[3].item];
      el.renderPagedData({type: 'data', data: messages});
      jasmine.clock().tick(1000);
      expect(el.renderPagedDataDone).toHaveBeenCalledWith(affectedItems, jasmine.any(DocumentFragment), {type: 'data', data: messages});
    });

    it("Should do nothing if no data received", function() {
      el.props.lastPagedAt = 0;
      spyOn(el, "renderPagedDataDone");
      el.renderPagedData({type: 'data', data: []});
      jasmine.clock().tick(1000);
      expect(el.renderPagedDataDone).not.toHaveBeenCalled();
      expect(el.props.lastPagedAt).toBe(0);
    });
  });

  describe("The renderPagedDataDone() method", function() {
    it("Should call processAffectedWidgets with widgets found in both the Fragment and the List", function() {
      var messages = [conversation.createMessage("mm 0"), conversation.createMessage("mm 1")];
      var fragment = el.generateFragment(messages);
      spyOn(el, "processAffectedWidgets");
      el.renderPagedDataDone([query.data[99], query.data[98], messages[0], messages[1]], fragment, {type: 'data', data: messages});
      expect(el.processAffectedWidgets).toHaveBeenCalledWith(jasmine.arrayContaining([el.childNodes[1], el.childNodes[2], el.childNodes[3], el.childNodes[4]]), true);
    });

    it("Should insert the Document Fragment just after the loading indicator", function() {
      var messages = [conversation.createMessage("mm 0"), conversation.createMessage("mm 1")];
      var fragment = el.generateFragment(messages);
      el.renderPagedDataDone([query.data[99], query.data[98], messages[0], messages[1]], fragment, {type: 'data', data: messages});
      expect(el.childNodes[0].classList.contains('layer-load-indicator')).toBe(true);
      expect(el.childNodes[1].item).toBe(messages[0]);
    });

    it("Should scroll to bottom if stuck to bottom", function() {
      el.scrollTop = 0;
      el.props.stuckToBottom = true;
      spyOn(el, "scrollTo");
      var messages = [conversation.createMessage("mm 0"), conversation.createMessage("mm 1")];
      var fragment = el.generateFragment(messages);
      el.renderPagedDataDone([query.data[99], query.data[98], messages[0], messages[1]], fragment, {type: 'data', data: messages});
      expect(el.scrollTo).toHaveBeenCalledWith(el.scrollHeight - el.clientHeight);
    });

    it("Should scroll to the item that was on top of the visible viewport prior to the insertion", function() {
      el.scrollTop = el.childNodes[10].offsetTop - el.offsetTop;
      expect(el.findFirstVisibleItem()).toBe(el.childNodes[10]);
      el.props.stuckToBottom = false;
      spyOn(el, "scrollTo");
      var messages = [conversation.createMessage("mm 0"), conversation.createMessage("mm 1")];
      var fragment = el.generateFragment(messages);
      el.renderPagedDataDone([query.data[99], query.data[98], messages[0], messages[1]], fragment, {type: 'data', data: messages});

      // What was the 10th item is now the 12th item
      expect(el.scrollTo).toHaveBeenCalledWith(el.childNodes[12].offsetTop - el.offsetTop);
    });
  });
});