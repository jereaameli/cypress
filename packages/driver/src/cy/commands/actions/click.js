/* eslint-disable
    no-cond-assign,
    no-undef,
    no-unused-vars,
    one-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const _ = require('lodash')
const $ = require('jquery')
const Promise = require('bluebird')

const $Mouse = require('../../../cypress/mouse')

const $dom = require('../../../dom')
const $utils = require('../../../cypress/utils')
const $elements = require('../../../dom/elements')
const $selection = require('../../../dom/selection')
const $actionability = require('../../actionability')
const $native = require('../../../cypress/native_events')

module.exports = (Commands, Cypress, cy, state, config) => {
  return Commands.addAll({ prevSubject: 'element' }, {
    click (subject, positionOrX, y, options = {}) {
    //# TODO handle pointer-events: none
    //# http://caniuse.com/#feat=pointer-events

      let position, x;

      ({ options, position, x, y } = $actionability.getPositionFromArguments(positionOrX, y, options))

      _.defaults(options, {
        $el: subject,
        log: true,
        verify: true,
        force: false,
        multiple: false,
        position,
        x,
        y,
        errorOnSelect: true,
        waitForAnimations: config('waitForAnimations'),
        animationDistanceThreshold: config('animationDistanceThreshold'),
      })

      //# throw if we're trying to click multiple elements
      //# and we did not pass the multiple flag
      if ((options.multiple === false) && (options.$el.length > 1)) {
        $utils.throwErrByPath('click.multiple_elements', {
          args: { num: options.$el.length },
        })
      }

      const win = state('window')

      const click = (el, index) => {
        let deltaOptions
        const $el = $(el)

        const domEvents = {}
        const $previouslyFocusedEl = null

        if (options.log) {
        //# figure out the options which actually change the behavior of clicks
          deltaOptions = $utils.filterOutOptions(options)

          options._log = Cypress.log({
            message: deltaOptions,
            $el,
          })

          options._log.snapshot('before', { next: 'after' })
        }

        if (options.errorOnSelect && $el.is('select')) {
          $utils.throwErrByPath('click.on_select_element', { onFail: options._log })
        }

        const afterMouseDown = function ($elToClick, coords) {
        //# we need to use both of these
          const { fromWindow, fromViewport } = coords

          //# handle mouse events removing DOM elements
          //# https://www.w3.org/TR/uievents/#event-type-click (scroll up slightly)

          const consoleProps = function () {
            const consoleObj = _.defaults(consoleObj != null ? consoleObj : {}, {
              'Applied To': $dom.getElements($el),
              'Elements': $el.length,
              'Coords': _.pick(fromWindow, 'x', 'y'), //# always absolute
              'Options': deltaOptions,
            })

            if ($el.get(0) !== $elToClick.get(0)) {
            //# only do this if $elToClick isnt $el
              consoleObj['Actual Element Clicked'] = $dom.getElements($elToClick)
            }

            consoleObj.groups = function () {
              const groups = [{
                name: 'MouseDown',
                items: _.pick(domEvents.mouseDown, 'preventedDefault', 'stoppedPropagation', 'modifiers'),
              }]

              if (domEvents.mouseUp) {
                groups.push({
                  name: 'MouseUp',
                  items: _.pick(domEvents.mouseUp, 'preventedDefault', 'stoppedPropagation', 'modifiers'),
                })
              }

              if (domEvents.click) {
                groups.push({
                  name: 'Click',
                  items: _.pick(domEvents.click, 'preventedDefault', 'stoppedPropagation', 'modifiers'),
                })
              }

              return groups
            }

            return consoleObj
          }

          return Promise.try(() => {
            if (options.force) {
              if ($dom.isAttached($elToClick)) {
                domEvents.mouseUp = $Mouse.mouseUp($elToClick, fromViewport)
              }

              if ($dom.isAttached($elToClick)) {
                domEvents.click = $Mouse.click($elToClick, fromViewport)
              }
            } else {
              return Promise.resolve(null)
            }
          }).delay($actionability.delay, 'click')
          .then(() => {
          //# display the red dot at these coords
            if (options._log) {
              const consoleObj = options._log.invoke('consoleProps')

              //# because we snapshot and output a command per click
              //# we need to manually snapshot + end them
              options._log.set({ coords: fromWindow, consoleProps })
            }

            //# we need to split this up because we want the coordinates
            //# to mutate our passed in options._log but we dont necessary
            //# want to snapshot and end our command if we're a different
            //# action like (cy.type) and we're borrowing the click action
            if (options._log && options.log) {
              return options._log.snapshot().end()
            }
          }).return(null)
        }

        //# we want to add this delay delta to our
        //# runnables timeout so we prevent it from
        //# timing out from multiple clicks
        cy.timeout($actionability.delay, true, 'click')

        //# must use callbacks here instead of .then()
        //# because we're issuing the clicks synchonrously
        //# once we establish the coordinates and the element
        //# passes all of the internal checks
        return $actionability.verify(cy, $el, options, {
          onScroll ($el, type) {
            return Cypress.action('cy:scrolled', $el, type)
          },

          onReady ($elToClick, coords) {
          //# record the previously focused element before
          //# issuing the mousedown because browsers may
          //# automatically shift the focus to the element
          //# without firing the focus event
            if (!options.force) {
              return $native.click($elToClick, coords.fromViewport)
              .then(() => {
                return afterMouseDown($elToClick, coords)
              })
            }

            const $previouslyFocused = cy.getFocused()

            if (el = cy.needsForceFocus()) {
              cy.fireFocus(el)
            }

            el = $elToClick.get(0)

            domEvents.mouseDown = $Mouse.mouseDown($elToClick, coords.fromViewport)

            //# if mousedown was cancelled then or caused
            //# our element to be removed from the DOM
            //# just resolve after mouse down and dont
            //# send a focus event
            if (domEvents.mouseDown.preventedDefault || !$dom.isAttached($elToClick)) {
              return afterMouseDown($elToClick, coords)
            }

            if ($elements.isInput(el) || $elements.isTextarea(el) || $elements.isContentEditable(el)) {
              if (!$elements.isNeedSingleValueChangeInputElement(el)) {
                $selection.moveSelectionToEnd(el)
              }
            }

            //# retrieve the first focusable $el in our parent chain
            const $elToFocus = $elements.getFirstFocusableEl($elToClick)

            if (cy.needsFocus($elToFocus, $previouslyFocused)) {
              cy.fireFocus($elToFocus.get(0))

              //# if we are currently trying to focus
              //# the body then calling body.focus()
              //# is a noop, and it will not blur the
              //# current element, which is all so wrong
              if ($elToFocus.is('body')) {
                const $focused = cy.getFocused()

                //# if the current focused element hasn't changed
                //# then blur manually
                if ($elements.isSame($focused, $previouslyFocused)) {
                  cy.fireBlur($focused.get(0))
                }
              }
            }

            return afterMouseDown($elToClick, coords)

          },
        })
        .catch((err) => {
        //# snapshot only on click failure
          err.onFail = function () {
            if (options._log) {
              return options._log.snapshot()
            }
          }

          //# if we give up on waiting for actionability then
          //# lets throw this error and log the command
          return $utils.throwErr(err, { onFail: options._log })
        })
      }

      return Promise
      .each(options.$el.toArray(), click)
      .then(() => {
        let verifyAssertions

        if (options.verify === false) {
          return options.$el
        }

        return (verifyAssertions = () => {
          return cy.verifyUpcomingAssertions(options.$el, options, {
            onRetry: verifyAssertions,
          })
        })()
      })
    },

    //# update dblclick to use the click
    //# logic and just swap out the event details?
    dblclick (subject, options = {}) {
      _.defaults(options,
        { log: true })

      const dblclicks = []

      const dblclick = (el, index) => {
        let log
        const $el = $(el)

        //# we want to add this delay delta to our
        //# runnables timeout so we prevent it from
        //# timing out from multiple clicks
        cy.timeout($actionability.delay, true, 'dblclick')

        if (options.log) {
          log = Cypress.log({
            $el,
            consoleProps () {
              return {
                'Applied To': $dom.getElements($el),
                'Elements': $el.length,
              }
            },
          })
        }

        cy.ensureVisibility($el, log)

        const p = cy.now('focus', $el, { $el, error: false, verify: false, log: false }).then(() => {
          const event = new MouseEvent('dblclick', {
            bubbles: true,
            cancelable: true,
          })

          el.dispatchEvent(event)

          // $el.cySimulate("dblclick")

          // log.snapshot() if log

          //# need to return null here to prevent
          //# chaining thenable promises
          return null
        }).delay($actionability.delay, 'dblclick')

        dblclicks.push(p)

        return p
      }

      //# create a new promise and chain off of it using reduce to insert
      //# the artificial delays.  we have to set this as cancellable for it
      //# to propogate since this is an "inner" promise

      //# return our original subject when our promise resolves
      return Promise
      .resolve(subject.toArray())
      .each(dblclick)
      .return(subject)
    },
  })
}

