(function(){const c={firstName:["first name","firstname","first_name","given name","fname"],lastName:["last name","lastname","last_name","family name","lname","surname"],fullName:["full name","fullname","full_name","your name","candidate name"],email:["email","e-mail","mail address","email_address"],phone:["phone","mobile","telephone","tel","contact number"],city:["city","town","location","residence"],country:["country","nation","territory"],linkedin:["linkedin","linked-in"],github:["github","git-hub"],website:["website","portfolio","personal link","homepage","blog"],school:["school","university","college","education","institution"],degree:["degree","qualification"],major:["major","field of study","specialization","discipline"],gradYear:["grad year","graduation year","completion date","grad date"],company:["company","organization","employer","most recent employer","previous employer"],jobTitle:["job title","title","role","position"],authorizedToWork:["authorized to work","legally authorized","right to work","eligible to work"],requiresSponsorship:["sponsor","visa","sponsorship"]},O=["?","why","describe","explain","reason","tell us","experience with","interest in","cover letter","statement","additional details"];function s(o,t){return o.some(i=>t.some(l=>i.toLowerCase().includes(l.toLowerCase())))}function q(o,t){var m,y;const i=(m=Object.getOwnPropertyDescriptor(o,"value"))==null?void 0:m.set,l=Object.getPrototypeOf(o),u=(y=Object.getOwnPropertyDescriptor(l,"value"))==null?void 0:y.set;u&&i!==u?u.call(o,t):i?i.call(o,t):o.value=t,o.dispatchEvent(new Event("input",{bubbles:!0})),o.dispatchEvent(new Event("change",{bubbles:!0})),o.dispatchEvent(new Event("blur",{bubbles:!0}))}async function D(o,t,i){const u=await(await fetch(o)).blob();return new File([u],t,{type:i})}function A(o){o.classList.add("autofilled-highlight"),setTimeout(()=>o.classList.remove("autofilled-highlight"),2500)}function P(){var y,f,T,g,S,e;let o="",t="";const i=(y=document.querySelector(".app-title"))==null?void 0:y.textContent,l=((f=document.querySelector(".company-name"))==null?void 0:f.textContent)||((T=document.querySelector("#logo img"))==null?void 0:T.getAttribute("alt")),u=(g=document.querySelector(".posting-header h2"))==null?void 0:g.textContent,m=(S=document.querySelector(".posting-header .categories-list"))==null?void 0:S.textContent;return t=i||u||document.title||"Target Position",o=(l==null?void 0:l.trim())||((e=m==null?void 0:m.split("•")[0])==null?void 0:e.trim())||"Target Company",{company:o,role:t}}async function R(o){const{personal:t,education:i,experience:l,resume:u,geminiApiKey:m,resumeText:y}=o;let f=0,T=0;const g=[],S=Array.from(document.querySelectorAll("input, select, textarea"));for(const e of S){const x=e.id||"",C=e.name||"",h=e.getAttribute("placeholder")||"",w=e.getAttribute("autocomplete")||"",$=e.getAttribute("aria-label")||"";let p="";const L=e.closest("label");L&&(p+=" "+L.textContent),x&&document.querySelectorAll(`label[for="${x}"]`).forEach(b=>{p+=" "+b.textContent});const N=e.getAttribute("aria-labelledby");if(N){const d=document.getElementById(N);d&&(p+=" "+d.textContent)}const n=[x,C,h,w,$,p];if(e instanceof HTMLInputElement&&e.type==="file"&&u&&u.base64&&s(n,["resume","cv","curriculum","file","upload"]))try{const b=await D(u.base64,u.name,u.type),E=new DataTransfer;E.items.add(b),e.files=E.files,e.dispatchEvent(new Event("change",{bubbles:!0})),e.dispatchEvent(new Event("input",{bubbles:!0}));const k=e.parentElement||e;A(k),f++;continue}catch(b){console.error("Failed to upload resume file:",b)}if(e.type==="hidden"||e.type==="submit"||e.type==="button"||e.type==="file")continue;let r="",a=!1;if(t.customFields&&t.customFields.length>0){for(const d of t.customFields)if(s(n,[d.key])){r=d.value,a=!0;break}}if(a||(s(n,c.firstName)?(r=t.firstName,a=!0):s(n,c.lastName)?(r=t.lastName,a=!0):s(n,c.fullName)?(r=t.firstName&&t.lastName?`${t.firstName} ${t.lastName}`:t.firstName||t.lastName,a=!0):s(n,c.email)?(r=t.email,a=!0):s(n,c.phone)?(r=t.phone,a=!0):s(n,c.city)?(r=t.city,a=!0):s(n,c.country)?(r=t.country,a=!0):s(n,c.linkedin)?(r=t.linkedin,a=!0):s(n,c.github)?(r=t.github,a=!0):s(n,c.website)?(r=t.website,a=!0):s(n,c.school)?(r=i.school,a=!0):s(n,c.degree)?(r=i.degree,a=!0):s(n,c.major)?(r=i.major,a=!0):s(n,c.gradYear)?(r=i.gradYear,a=!0):s(n,c.company)?(r=l.company,a=!0):s(n,c.jobTitle)&&(r=l.title,a=!0)),e instanceof HTMLInputElement&&(e.type==="radio"||e.type==="checkbox")){const d=s(n,c.authorizedToWork),b=s(n,c.requiresSponsorship);if(d||b){const E=d?t.authorizedToWork:t.requiresSponsorship,k=p.toLowerCase(),v=e.value.toLowerCase(),F=e.id.toLowerCase(),j=k.includes("yes")||v==="yes"||v==="y"||v==="1"||v==="true"||F.includes("yes"),I=k.includes("no")||v==="no"||v==="n"||v==="0"||v==="false"||F.includes("no");if(E==="yes"&&j||E==="no"&&I){e.checked||(e.click(),e.checked=!0,e.dispatchEvent(new Event("change",{bubbles:!0})),f++);continue}}}if(a&&r){if(e instanceof HTMLSelectElement){const b=Array.from(e.options).find(E=>E.value.toLowerCase()===r.toLowerCase()||E.text.toLowerCase().includes(r.toLowerCase()));b&&(q(e,b.value),A(e),f++)}else q(e,r),A(e),f++;continue}if(!a&&m&&(e instanceof HTMLTextAreaElement||e instanceof HTMLInputElement&&e.type==="text")){const d=p.trim()||h.trim()||C.trim()||x.trim();(e instanceof HTMLTextAreaElement||s(n,O))&&d.length>3&&g.push({el:e,label:d,index:g.length})}}if(g.length>0&&m){const{company:e,role:x}=P(),C=Y(t,i,l,y,e,x,g);try{console.log(`Smart Job Filler: Querying Gemini for ${g.length} questions...`);const h=await new Promise((w,$)=>{chrome.runtime.sendMessage({type:"CALL_GEMINI",payload:{apiKey:m,promptText:C}},p=>{chrome.runtime.lastError?$(chrome.runtime.lastError):w(p)})});if(h&&h.success){let w=h.text.trim();w.startsWith("```")&&(w=w.replace(/^```json\s*|```$/gi,"").trim());const $=JSON.parse(w);if($&&Array.isArray($.answers))for(const p of $.answers){const L=g.find(N=>N.index===p.index);L&&p.text&&(q(L.el,p.text),A(L.el),T++,f++)}}else console.error("Gemini failed to answer questions:",h==null?void 0:h.error)}catch(h){console.error("AI form filling request failed:",h)}}return{filledCount:f,aiCount:T}}function Y(o,t,i,l,u,m,y){return`You are an AI assistant helping a candidate fill out a job application.
Candidate Profile:
Name: ${o.firstName} ${o.lastName}
Email: ${o.email}
Phone: ${o.phone}
City: ${o.city}, ${o.country}
LinkedIn: ${o.linkedin}
GitHub: ${o.github}
Portfolio/Website: ${o.website}
Work Auth: Authorized to work: ${o.authorizedToWork}, Requires sponsorship: ${o.requiresSponsorship}

Education:
School: ${t.school}
Degree: ${t.degree} in ${t.major}
Graduation Year: ${t.gradYear}

Professional Experience:
Company: ${i.company}
Title: ${i.title}
Dates: ${i.startYear} - ${i.isCurrent?"Present":i.endYear}
Description: ${i.description}

Resume/Bio context:
${l||"No detailed resume text provided."}

Company Name: ${u}
Job Title: ${m}

The job application form contains the following complex questions. 
For each question, draft a concise, professional, and tailored response (under 120 words) based on the candidate's profile and resume. Ensure the tone is proactive, honest, and matching standard engineering standards.
Return the result strictly as a valid JSON object matching the schema below. Do not wrap in markdown or add notes outside the JSON structure.

JSON Response Schema:
{
  "answers": [
    {
      "index": 0,
      "text": "Drafted answer text for question 0..."
    }
  ]
}

Questions to answer:
${y.map(f=>`[Question ${f.index}]: "${f.label}"`).join(`
`)}
`}chrome.runtime.onMessage.addListener((o,t,i)=>{if(o.type==="FILL_FORM")return R(o.payload).then(l=>{i({success:!0,...l})}).catch(l=>{i({success:!1,message:l.message})}),!0});console.log("Smart AI Job Form Filler Content Script loaded");
})()
