import * as assert from "assert";
import * as vscode from "vscode";
import {PreviewContainer} from "../src/previewContainer"
import Reporter from "../src/telemetry";
import vscodeUtils from "../src/vscodeUtilities";


/**
 * this suite tests both previewContainer and pythonPreview
 * by activating funcs in previewContainer and looking at html rendered by pythonPreview
 */
suite("PreviewContainer and pythonPreview Tests", () => {

    const arepl = vscode.extensions.getExtension("almenon.arepl")!;

    const mockContext: any = {
        asAbsolutePath: (file: string)=>{
            return __dirname + "/" + file
        },
        extensionPath: arepl.extensionPath,
    }

    const mockSettings: any = {
        inlineResults:true,
        get: function(arg){
            if(arg == 'inlineResults') return this.inlineResults
        }
    }

    const previewContainer = new PreviewContainer(new Reporter(false), mockContext, mockSettings, 0);
    const panel = previewContainer.start()

    suiteSetup(function(done){
        // existing editor causes weird error for some reason
        vscode.commands.executeCommand("workbench.action.closeActiveEditor").then(()=>{
            // needed for inline errors
            vscodeUtils.newUnsavedPythonDoc().then(()=>{done()})
        })
    })

    test("landing page displayed", function(){
        assert.equal(panel.webview.html.includes("Start typing or make a change and your code will be evaluated."), 
                    true, panel.webview.html);
    });

    test("print", function(){
        previewContainer.handlePrint("hello world");
        assert.equal(panel.webview.html.includes("hello world"), true, panel.webview.html);
    });

    test("spawn error", function(){
        previewContainer.displayProcessError("python3 -u ENOENT")
        assert.equal(panel.webview.html.includes("Error in the AREPL extension"), true, panel.webview.html);
    });

    test("error", function(){
        previewContainer.handleResult(
            {
                caller: "",
                done: true,
                execTime: 0,
                internalError: "",
                lineno: -1,
                totalPyTime: 0,
                totalTime: 0,
                userError: `Traceback (most recent call last):
  line 1, in <module>
NameError: name 'x' is not defined`,
                userVariables: {},
            }
        )
        assert.equal(panel.webview.html.includes("NameError"), true, panel.webview.html);
    });

    test("error should be googleable", function(){
        previewContainer.handleResult(
            {
                caller: "",
                done: true,
                execTime: 0,
                internalError: "",
                lineno: -1,
                totalPyTime: 0,
                totalTime: 0,
                userError: "json.decoder.JSONDecodeError: Expecting value: line 1 column 1 (char 0)",
                userVariables: {},
            }
        )

        assert.equal(panel.webview.html.includes(
            "https://www.google.com/search?q=python json.decoder.JSONDecodeError"),true, panel.webview.html,
        );
    });

    test("internal error", function(){
        previewContainer.handleResult(
            {
                caller: "",
                done: true,
                execTime: 0,
                internalError: "internal error!",
                lineno: -1,
                totalPyTime: 0,
                totalTime: 0,
                userError: "",
                userVariables: {},
            }
        )
        assert.equal(panel.webview.html.includes("internal error!"), true, panel.webview.html);
    });

    test("time", function(){
        previewContainer.handleResult(
            {
                caller: "",
                done: true,
                execTime: 5513,
                internalError: "",
                lineno: -1,
                totalPyTime: 0,
                totalTime: 0,
                userError: "",
                userVariables: {},
            }
        )
        assert.equal(panel.webview.html.includes("5513"), true, panel.webview.html);
    });

    test("userVariables", function(){
        previewContainer.handleResult(
            {
                caller: "",
                done: true,
                execTime: 0,
                internalError: "",
                lineno: -1,
                totalPyTime: 0,
                totalTime: 0,
                userError: "",
                userVariables: {x: 5},
        }
        )
        assert.equal(panel.webview.html.includes('"x":5'), true, panel.webview.html);
    });

    test("dump userVariables", function(){
        previewContainer.handleResult(
            {
                caller: "",
                done: false,
                execTime: 0,
                internalError: "",
                lineno: 1,
                totalPyTime: 0,
                totalTime: 0,
                userError: "",
                userVariables: {"dump output": {'x':5}},
        }
        )
        assert.equal(panel.webview.html.includes('"x":5'), true, panel.webview.html);
    });

    test("function dump userVariables", function(){
        previewContainer.handleResult(
            {
                caller: "foo",
                done: false,
                execTime: 0,
                internalError: "",
                lineno: 1,
                totalPyTime: 0,
                totalTime: 0,
                userError: "",
                userVariables: {'x':5},
        }
        )
        assert.equal(panel.webview.html.includes('"x":5'), true, panel.webview.html);
    });

    test("print escapes panel.webview.html", function(){
        previewContainer.handlePrint("<module>")
        assert.equal(panel.webview.html.includes("&lt;module&gt;"), true, panel.webview.html);
    });

    suiteTeardown(function(){
        panel.dispose()
    })

});