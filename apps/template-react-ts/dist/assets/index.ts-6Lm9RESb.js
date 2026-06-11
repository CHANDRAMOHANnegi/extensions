(function(){console.log("Template React-TS Content Script Loaded");chrome.runtime.sendMessage({type:"GET_EXTENSION_INFO"},e=>{console.log("Response from background in content script:",e)});
})()
