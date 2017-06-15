"use strict";

Object.defineProperty(exports, "__esModule", {
   value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

var _reactRedux = require("react-redux");

var _redux = require('redux');

var _ducksQuantityActions = require('../ducks/quantity/actions');

var _ducksQuantityActions2 = _interopRequireDefault(_ducksQuantityActions);

var _ducksQuantitySelectors = require('../ducks/quantity/selectors');

var _Draggable = require("./Draggable");

var _Draggable2 = _interopRequireDefault(_Draggable);

var Anchor = (function (_React$Component) {
   _inherits(Anchor, _React$Component);

   function Anchor(props) {
      _classCallCheck(this, Anchor);

      _get(Object.getPrototypeOf(Anchor.prototype), "constructor", this).call(this, props);
      this.dragStart = this.dragStart.bind(this);
      this.dragMove = this.dragMove.bind(this);
      this.dragEnd = this.dragEnd.bind(this);
   }

   _createClass(Anchor, [{
      key: "dragStart",
      value: function dragStart(initPos) {
         //this.startOffset = this.props.pos.y-initPos.y //offset in px
         //this.props.setX0(this.startOffset, this.props.coordSys.yScale)
      }
   }, {
      key: "dragMove",
      value: function dragMove(newPos) {
         //var newYPos = newPos.y+this.startOffset
         //this.props.setX0(newYPos, this.props.coordSys.yScale)
      }
   }, {
      key: "dragEnd",
      value: function dragEnd(endPos) {}
   }, {
      key: "render",
      value: function render() {
         var pos = this.props.pos;
         var width = 80;
         var height = 15;
         var maskString = 'url(#' + this.props.mask + ')';

         return _react2["default"].createElement(Path, null);
      }
   }]);

   return Anchor;
})(_react2["default"].Component);

function calcArrow(tail, tip, w, tw, ar) {
   //tailPosition, tipPosition, width of arrow,width of tip, tipWidth/tipLength
   var dx = tip.x - tail.x;
   var dy = tip.y - tail.y;
   var l = Math.sqrt(xd * dx + dy * dy);
   ar = ar || Math.sqrt(3);
   tw = tw || 2 * w;
   if (l < tw / ar) {
      tw = l * ar;
   }
   var tipL = tw / ar;

   return [{ x: 100, y: -w / 2 }, { x: l - tipL, y: -w / 2 }, { x: l - tipL, y: -tw / 2 }, { x: l, y: 0 }, { x: l - tipL, y: tw / 2 }, { x: l - tipL, y: w / 2 }, { x: 0, y: w / 2 }];
}

function mapStateToProps(state, props) {
   var br = props.boundingRect;
   var coordSys = (0, _ducksQuantitySelectors.getCoordSys)(state, props.xVar, props.yVar, br);
   return {
      pos: {
         x: (0, _ducksQuantitySelectors.getTransformedValue)(state, props.xVar, coordSys.xScale),
         y: (0, _ducksQuantitySelectors.getTransformedValue)(state, props.yVar, coordSys.yScale)
      },
      coordSys: coordSys

   };
}

function mapDispatchToProps(dispatch) {
   return {
      setX0: function setX0(value, scale) {
         dispatch(_ducksQuantityActions2["default"].setValueFromCoords('x', value, scale));
      },
      setValue: function setValue(name, value) {
         dispatch(_ducksQuantityActions2["default"].setValue(name, value));
      },
      setPlay: function setPlay(name, value) {
         dispatch(_ducksQuantityActions2["default"].setPlay(name, value));
      }
   };
}

exports["default"] = (0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps)(Anchor);
module.exports = exports["default"];
