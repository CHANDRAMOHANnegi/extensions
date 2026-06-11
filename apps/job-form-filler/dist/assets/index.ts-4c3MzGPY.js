chrome.runtime.onInstalled.addListener(()=>{console.log("Smart Job Form Filler Extension Installed")});chrome.runtime.onMessage.addListener((e,r,n)=>(e.type==="PING"&&n({pong:!0}),!0));
