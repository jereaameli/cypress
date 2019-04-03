$errUtils = require("../../../../src/cypress/error_utils.js")
$errorMessages = Cypress.errorMessages

describe "driver/src/cypress/error_utils", ->
  context ".appendErrMsg", ->
    it "appends error message", ->
      err = new Error("foo")

      expect(err.message).to.eq("foo")
      expect(err.name).to.eq("Error")

      stack = err.stack.split("\n").slice(1).join("\n")

      err2 = $errUtils.appendErrMsg(err, "bar")
      expect(err2.message).to.eq("foo\n\nbar")

      expect(err2.stack).to.eq("Error: foo\n\nbar\n" + stack)

    it "handles error messages matching first stack", ->
      err = new Error("r")

      expect(err.message).to.eq("r")
      expect(err.name).to.eq("Error")

      stack = err.stack.split("\n").slice(1).join("\n")

      err2 = $errUtils.appendErrMsg(err, "bar")
      expect(err2.message).to.eq("r\n\nbar")

      expect(err2.stack).to.eq("Error: r\n\nbar\n" + stack)

    it "handles empty error messages", ->
      err = new Error()

      expect(err.message).to.eq("")
      expect(err.name).to.eq("Error")

      stack = err.stack.split("\n").slice(1).join("\n")

      err2 = $errUtils.appendErrMsg(err, "bar")
      expect(err2.message).to.eq("\n\nbar")

      expect(err2.stack).to.eq("Error: \n\nbar\n" + stack)
    
    it "handles error messages as objects", ->
      err = new Error("foo")

      obj = {
        message: "bar",
        docsUrl: "baz"
      }

      stack = err.stack.split("\n").slice(1).join("\n")

      err2 = $errUtils.appendErrMsg(err, obj)

      expect(err2.message).to.eq("foo\n\nbar")
      expect(err2.docsUrl).to.eq("baz")
      expect(err2.stack).to.eq("Error: foo\n\nbar\n" + stack)

  context ".cloneErr", ->
    it "copies properties, message, stack", ->
      obj = {
        stack: "stack"
        message: "message"
        name: "Foo"
        code: 123
      }

      err = $errUtils.cloneErr(obj)

      expect(err).to.be.instanceof(window.Error)

      for key, val of obj
        expect(err[key], "key: #{key}").to.eq(obj[key])

  context ".throwErr", ->
    it "throws the error as sent", ->
      try
        $errUtils.throwErr("Something unexpected")
      catch e
        expect(e.message).to.include "Something unexpected"
        expect(e.name).to.eq "CypressError"

  context ".throwErrByPath", ->
    beforeEach ->
      $errorMessages.__test_errors = {
        simple: "This is a simple error message"
        with_args: "The has args like '{{foo}}' and {{bar}}"
        with_multi_args: "This has args like '{{foo}}' and {{bar}}, and '{{foo}}' is used twice"
      }

    describe "when error message path does not exist", ->
      it "has an err.name of InternalError", ->
        try
          $errUtils.throwErrByPath("not.there")
        catch e
          expect(e.name).to.eq "InternalError"

      it "has the right message", ->
        try
          $errUtils.throwErrByPath("not.there")
        catch e
          expect(e.message).to.include "Error message path 'not.there' does not exist"

    describe "when error message path exists", ->
      it "has an err.name of CypressError", ->
        try
          $errUtils.throwErrByPath("__test_errors.simple")
        catch e
          expect(e.name).to.eq "CypressError"

      it "has the right message", ->
        try
          $errUtils.throwErrByPath("__test_errors.simple")
        catch e
          expect(e.message).to.include "This is a simple error message"

    describe "when args are provided for the error", ->
      it "uses them in the error message", ->
        try
          $errUtils.throwErrByPath("__test_errors.with_args", {
            args: { foo: "foo", bar: ["bar", "qux"]  }
          })
        catch e
          expect(e.message).to.include "The has args like 'foo' and bar,qux"

    describe "when args are provided for the error and some are used multiple times in message", ->

      it "uses them in the error message", ->
        try
          $errUtils.throwErrByPath("__test_errors.with_multi_args", {
            args: { foo: "foo", bar: ["bar", "qux"]  }
          })
        catch e
          expect(e.message).to.include "This has args like 'foo' and bar,qux, and 'foo' is used twice"

    describe "when onFail is provided as a function", ->
      it "attaches the function to the error", ->
        onFail = ->
        try
          $errUtils.throwErrByPath("window.iframe_undefined", { onFail })
        catch e
          expect(e.onFail).to.equal onFail

    describe "when onFail is provided as a command", ->
      it "attaches the handler to the error", ->
        command = { error: @sandbox.spy() }
        try
          $errUtils.throwErrByPath("window.iframe_undefined", { onFail: command })
        catch e
          e.onFail("the error")
          expect(command.error).to.be.calledWith("the error")

  context ".formatErrMsg", ->
    it "returns obj with mdMessage when includeMdMessage", ->
        err = $errUtils.formatErrMsg("`foo`\n\nbar", {includeMdMessage: true})
        expect(err.message).to.eq("`foo`\n\nbar")
        expect(err.mdMessage).to.eq("`foo`\n\nbar")

    it "returns string msg when no includeMdMessage", ->
      err = $errUtils.formatErrMsg("`foo`\n\nbar")
      expect(err).to.eq("`foo`\n\nbar")

  context ".errObjByPath", ->
    it "returns obj when err is object", ->
      msg = $errUtils.errMsgByPath('uncaught.fromApp')
      expect(msg).to.be.an.object

    it "returns obj when err is string", ->
      msg = $errUtils.errMsgByPath('chai.match_invalid_argument', {
        regExp: 'foo'
      })

      expect(msg).to.be.an.object

    it "returns obj when err is function"

  context ".errMsgByPath", ->
    it "returns the message when err is object", ->
      msg = $errUtils.errMsgByPath('uncaught.fromApp')
      expect(msg).to.include("This error originated from your application code, not from Cypress.")

    it "returns the message when err is string", ->
      msg = $errUtils.errMsgByPath('chai.match_invalid_argument', {
        regExp: 'foo'
      })

      expect(msg).to.eq("`match` requires its argument be a `RegExp`. You passed: `foo`")

    it "returns the message when err is function"

  context ".getCodeFrame", ->
    it "returns a code frame with syntax highlighting", ->
      path = "foo/bar/baz"
      line = 5
      column = 6
      src = """
        <!DOCTYPE html>
        <html>
        <body>
          <script type="text/javascript">
            foo.bar()
          </script>
        </body>
        </html>
      """

      { frame, path, lineNumber, columnNumber } = $errUtils.getCodeFrame(src, path, line, column)

      expect(frame).to.contain("foo")
      expect(frame).to.contain("bar()")
      expect(frame).to.contain("[0m")
      expect(path).to.eq("foo/bar/baz")
      expect(lineNumber).to.eq(5)
      expect(columnNumber).to.eq(6)

    ## TODO determine if we want more failure cases covered
    it "returns empty string when code frame can't be generated", ->
      path = "foo/bar/baz"
      line = 100 ## There are not 100 lines in src
      column = 6
      src = """
        <!DOCTYPE html>
        <html>
        <body>
          <script type="text/javascript">
            foo.bar()
          </script>
        </body>
        </html>
      """

      { frame } = $errUtils.getCodeFrame(src, path, line, column)

      expect(frame).to.eq("")

  context ".escapeErrMarkdown", ->
    it "accepts non-strings", ->
      text = 3
      expect($errUtils.escapeErrMarkdown(text)).to.equal(3)

    it "escapes backticks", ->
      md = "`foo`"
      expect($errUtils.escapeErrMarkdown(md)).to.equal("\\`foo\\`")

  context ".getObjValueByPath", ->
    beforeEach ->
      @obj =
        foo: "foo"
        bar:
          baz:
            qux: "qux"

    it "throws if object not provided as first argument", ->
      fn = ->
        $errUtils.getObjValueByPath("foo")
      
      expect(fn).to.throw "The first parameter to utils.getObjValueByPath() must be an object"

    it "throws if path not provided as second argument", ->
      fn = =>
        $errUtils.getObjValueByPath(@obj)
      
      expect(fn).to.throw "The second parameter to utils.getObjValueByPath() must be a string"

    it "returns value for shallow path", ->
      objVal = $errUtils.getObjValueByPath @obj, "foo"
      expect(objVal).to.equal "foo"

    it "returns value for deeper path", ->
      objVal = $errUtils.getObjValueByPath @obj, "bar.baz.qux"
      expect(objVal).to.equal "qux"

    it "returns undefined for non-existent shallow path", ->
      objVal = $errUtils.getObjValueByPath @obj, "nope"
      expect(objVal).to.be.undefined

    it "returns undefined for non-existent deeper path", ->
      objVal = $errUtils.getObjValueByPath @obj, "bar.baz.nope"
      expect(objVal).to.be.undefined
