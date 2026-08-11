const SPREADSHEET_ID='12sbbWo-u1zNAl7bfCBDIPHH6XKoIBF8Lm8K-MA0HRvo';
const EVENT_SHEET='16_ENGAGEMENT_EVENTS';
const SESSION_SHEET='17_VISITOR_SESSIONS';
const SIGNAL_SHEET='18_INTEREST_SIGNALS';
const DRAFT_SHEET='19_SURVEY_DRAFTS';
const LINK_SHEET='20_ASSET_LINKS';
const SEND_SHEET='21_ASSET_SENDS';
const SUBMIT_SHEET='06_SURVEY_RAW';

function doGet(){return json_({ok:true,service:'sunbot-school-development-telemetry',version:'1.1'});}
function doPost(e){
  try{
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    const type=body.type||'event'; let p=body.payload||{}; p=enrichFromLink_(p);
    const lock=LockService.getScriptLock(); lock.waitLock(5000);
    try{
      if(type==='event') writeEvent_(p);
      else if(type==='draft') upsertDraft_(p,false);
      else if(type==='submit'){upsertDraft_(p,true);writeSubmit_(p);}
      else if(type==='signal') writeSignal_(p);
      else if(type==='session') upsertSession_(p);
      else if(type==='link') writeLink_(p);
      else if(type==='send') writeSend_(p);
      else throw new Error('Unsupported type: '+type);
      if(p.link_id&&['event','draft','submit','signal','session'].indexOf(type)>=0) refreshAssetMetrics_(p.link_id);
    } finally { lock.releaseLock(); }
    return json_({ok:true,link_id:p.link_id||''});
  }catch(err){return json_({ok:false,error:String(err&&err.message||err)});}
}

function ss_(){return SpreadsheetApp.openById(SPREADSHEET_ID);}
function sheet_(name){const s=ss_().getSheetByName(name);if(!s)throw new Error('Missing sheet '+name);return s;}
function headers_(s){const h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0];const idx={};h.forEach((x,i)=>idx[x]=i);return {h,idx};}
function appendByHeader_(name,obj){const s=sheet_(name),x=headers_(s);s.appendRow(x.h.map(h=>obj[h]===undefined?'':serialize_(obj[h])));}
function serialize_(v){if(v===null||v===undefined)return '';if(typeof v==='object')return JSON.stringify(v);return v;}
function id_(prefix){return prefix+'-'+Utilities.getUuid();}
function now_(){return new Date();}
function bool_(v){return v===true||String(v).toUpperCase()==='TRUE';}

function enrichFromLink_(p){
  const lid=p.link_id||p.Link_ID||'';if(!lid)return p;
  const s=sheet_(LINK_SHEET),values=s.getDataRange().getValues();if(values.length<2)return p;
  const x=headers_(s);let row=null;for(let i=1;i<values.length;i++){if(String(values[i][x.idx.Link_ID])===String(lid)){row=values[i];break;}}
  if(!row)return p;
  const g=h=>row[x.idx[h]];
  return Object.assign({},p,{link_id:lid,school_id:p.school_id||g('School_ID')||'',school:p.school||g('School_Name')||'',audience:(p.audience&&p.audience!=='common')?p.audience:(g('Audience')||p.audience||'common'),source:p.source||g('Owner')||'',asset_type:p.asset_type||g('Asset_Type')||'',asset_version:p.asset_version||g('Asset_Version')||'',campaign:p.campaign||g('Campaign')||'',owner:p.owner||g('Owner')||'',opportunity_id:p.opportunity_id||g('Opportunity_ID')||'',attribution_type:'LINK_ATTRIBUTED'});
}

function writeEvent_(p){
  appendByHeader_(EVENT_SHEET,{Event_ID:p.event_id||id_('EVT'),Timestamp:p.ts||now_(),Session_ID:p.session_id,Visitor_ID:p.visitor_id,School_ID:p.school_id,School_Name_Param:p.school,Audience:p.audience,Source:p.source,Page_Type:p.page_type,Page_Path:p.page_path,Event_Name:p.event_name,Section_ID:p.section_id,Item_ID:p.item_id,Item_Label:p.item_label,Value:p.value,Dwell_ms:p.dwell_ms,Scroll_Depth:p.scroll_depth,Viewport:p.viewport,Referrer:p.referrer,UTM:p.utm,Attribution_Type:p.attribution_type||((p.link_id||p.school||p.school_id)?'LINK_ATTRIBUTED':'ANONYMOUS'),Consent_Mode:p.consent_mode||'ESSENTIAL_B2B_ANALYTICS',User_Agent_Class:p.user_agent_class,Raw_JSON:p,Link_ID:p.link_id,Asset_Type:p.asset_type,Asset_Version:p.asset_version,Campaign:p.campaign,Entry_From:p.entry_from});
  upsertSession_({session_id:p.session_id,visitor_id:p.visitor_id,link_id:p.link_id,school_id:p.school_id,school:p.school,audience:p.audience,source:p.source,asset_type:p.asset_type,asset_version:p.asset_version,campaign:p.campaign,entry_from:p.entry_from,page_path:p.page_path,event_name:p.event_name,section_id:p.section_id,scroll_depth:p.scroll_depth,dwell_ms:p.dwell_ms,item_label:p.item_label,progress_pct:p.progress_pct,last_survey_step:p.last_survey_step,ts:p.ts});
}

function upsertSession_(p){
  if(!p.session_id)return;
  const s=sheet_(SESSION_SHEET),values=s.getDataRange().getValues(),x=headers_(s);let r=-1;
  for(let i=1;i<values.length;i++){if(values[i][x.idx.Session_ID]===p.session_id){r=i+1;break;}}
  const old=r>0?s.getRange(r,1,1,x.h.length).getValues()[0]:Array(x.h.length).fill('');const get=h=>old[x.idx[h]];
  const pages=new Set(String(get('Last_Page')||'').split('|').filter(Boolean));if(p.page_path)pages.add(p.page_path);
  const sections=new Set(String(get('Sections_Viewed')||'').split('|').filter(Boolean));if(p.section_id)sections.add(p.section_id);
  const models=Number(get('Models_Opened')||0)+(p.event_name==='model_open'?1:0);const ctas=Number(get('CTA_Clicks')||0)+(p.event_name==='cta_click'?1:0);
  const surveyStarted=bool_(get('Survey_Started'))||p.event_name==='survey_start';const progress=Math.max(Number(get('Survey_Progress_Pct')||0),Number(p.progress_pct||0));const submitted=bool_(get('Survey_Submitted'))||p.event_name==='survey_submit';const totalDwell=Number(get('Total_Dwell_Sec')||0)+Math.round(Number(p.dwell_ms||0)/1000);
  const row={Session_ID:p.session_id,Visitor_ID:p.visitor_id||get('Visitor_ID'),First_Seen:get('First_Seen')||p.ts||now_(),Last_Seen:p.ts||now_(),School_ID:p.school_id||get('School_ID'),School_Name_Param:p.school||get('School_Name_Param'),Audience:p.audience||get('Audience'),Source:p.source||get('Source'),Attribution_Type:(p.link_id||p.school||p.school_id||get('School_Name_Param'))?'LINK_ATTRIBUTED':'ANONYMOUS',Entry_Page:get('Entry_Page')||p.page_path,Last_Page:p.page_path||get('Last_Page'),Pages_Viewed:pages.size,Sections_Viewed:Array.from(sections).join('|'),Max_Scroll_Depth:Math.max(Number(get('Max_Scroll_Depth')||0),Number(p.scroll_depth||0)),Total_Dwell_Sec:totalDwell,Models_Opened:models,CTA_Clicks:ctas,Survey_Started:surveyStarted,Survey_Progress_Pct:progress,Survey_Submitted:submitted,Last_Survey_Step:p.last_survey_step||get('Last_Survey_Step'),Interest_Score:scoreInterest_(models,ctas,totalDwell,progress,submitted),Hesitation_Score:get('Hesitation_Score')||0,Top_Interest:p.item_label||get('Top_Interest'),Top_Hesitation:get('Top_Hesitation'),Recommended_Action:get('Recommended_Action'),Owner:p.owner||get('Owner'),Updated_At:now_(),Link_ID:p.link_id||get('Link_ID'),Asset_Type:p.asset_type||get('Asset_Type'),Asset_Version:p.asset_version||get('Asset_Version'),Campaign:p.campaign||get('Campaign'),Entry_From:p.entry_from||get('Entry_From')};
  const out=x.h.map(h=>row[h]===undefined?get(h):row[h]);if(r>0)s.getRange(r,1,1,x.h.length).setValues([out]);else s.appendRow(out);
}
function scoreInterest_(models,ctas,dwell,progress,submitted){return Math.min(100,Math.round(models*5+ctas*8+Math.min(dwell/30,25)+progress*.35+(submitted?20:0)));}

function upsertDraft_(p,submitted){
  const draftId=p.draft_id||p.session_id;if(!draftId)return;
  const s=sheet_(DRAFT_SHEET),values=s.getDataRange().getValues(),x=headers_(s);let r=-1;for(let i=1;i<values.length;i++){if(values[i][x.idx.Draft_ID]===draftId){r=i+1;break;}}
  const old=r>0?s.getRange(r,1,1,x.h.length).getValues()[0]:Array(x.h.length).fill('');const get=h=>old[x.idx[h]];
  const map={Draft_ID:draftId,Timestamp_First:get('Timestamp_First')||p.ts||now_(),Timestamp_Last:p.ts||now_(),Session_ID:p.session_id,Visitor_ID:p.visitor_id,School_ID:p.school_id,School_Name_Param:p.school,Audience:p.audience,Source:p.source,Relationship:p.relationship,Current_Step:p.current_step,Progress_Pct:p.progress_pct,Name:p.name,Role:p.role,Phone:p.phone,Email:p.email,Children_Scale:p.children_scale,Main_Goals:p.main_goals,Preferred_Model:p.preferred_model,Teacher_Mode:p.teacher_mode,Space:p.space,Timing:p.timing,Public_Sites:p.public_sites,Public_Merger_Status:p.public_merger_status,Public_Legal_Entity:p.public_legal_entity,Public_Constraints:p.public_constraints,Private_Growth_Priority:p.private_growth_priority,Private_Parent_Goal:p.private_parent_goal,Private_Investment_Goal:p.private_investment_goal,System_Campuses:p.system_campuses,System_Decision_Model:p.system_decision_model,System_Pilot_Site:p.system_pilot_site,Existing_Status:p.existing_status,Equipment_Status:p.equipment_status,Past_Blocker:p.past_blocker,What_Changed:p.what_changed,New_Current_Program:p.new_current_program,Open_Text:p.open_text,Changed_Answers:p.changed_answers,Last_Focused_Field:p.last_focused_field,Last_Focused_At:p.last_focused_at,Abandoned:submitted?false:p.abandoned,Submitted:!!submitted,Submitted_At:submitted?(p.ts||now_()):get('Submitted_At'),Raw_JSON:p,Link_ID:p.link_id,Asset_Type:p.asset_type,Asset_Version:p.asset_version,Campaign:p.campaign,Entry_From:p.entry_from};
  const out=x.h.map(h=>map[h]===undefined?get(h):serialize_(map[h]));if(r>0)s.getRange(r,1,1,x.h.length).setValues([out]);else s.appendRow(out);
}
function writeSubmit_(p){appendByHeader_(SUBMIT_SHEET,Object.assign({},p,{Timestamp:p.ts||now_(),Session_ID:p.session_id,Audience:p.audience,School_Name_Param:p.school,Source:p.source,Link_ID:p.link_id,Asset_Type:p.asset_type,Asset_Version:p.asset_version,Campaign:p.campaign,Entry_From:p.entry_from,Raw_JSON:p}));}
function writeSignal_(p){appendByHeader_(SIGNAL_SHEET,{Signal_ID:p.signal_id||id_('SIG'),Timestamp:p.ts||now_(),Session_ID:p.session_id,School_ID:p.school_id,School_Name_Param:p.school,Audience:p.audience,Signal_Type:p.signal_type,Signal_Level:p.signal_level,Topic:p.topic,Evidence:p.evidence,Event_Count:p.event_count,Dwell_Sec:p.dwell_sec,Revisit_Count:p.revisit_count,Changed_Answer_Count:p.changed_answer_count,Abandon_After:p.abandon_after,Interest_Points:p.interest_points,Hesitation_Points:p.hesitation_points,Interpretation:p.interpretation,Sales_Implication:p.sales_implication,Recommended_Next_Action:p.recommended_next_action,Owner:p.owner,Status:p.status||'NEW',Reviewed_By:p.reviewed_by,Reviewed_At:p.reviewed_at,Link_ID:p.link_id,Asset_Type:p.asset_type,Asset_Version:p.asset_version,Campaign:p.campaign,Entry_From:p.entry_from});}

function writeLink_(p){appendByHeader_(LINK_SHEET,{Link_ID:p.link_id||id_('LNK'),Created_At:p.created_at||now_(),Updated_At:now_(),Active:p.active===undefined?true:p.active,School_ID:p.school_id,School_Name:p.school,Opportunity_ID:p.opportunity_id,Owner:p.owner,Audience:p.audience,Asset_Type:p.asset_type,Asset_Version:p.asset_version,Campaign:p.campaign,Primary_Channel:p.primary_channel,Landing_Path:p.landing_path,Short_Label:p.short_label,Full_URL:p.full_url,QR_Target_URL:p.qr_target_url||p.full_url,Attribution_Mode:p.attribution_mode||'LINK_ATTRIBUTED',Expires_At:p.expires_at,Notes:p.notes,Status:p.status||'ACTIVE'});}
function writeSend_(p){appendByHeader_(SEND_SHEET,{Send_ID:p.send_id||id_('SND'),Link_ID:p.link_id,School_ID:p.school_id,Opportunity_ID:p.opportunity_id,Asset_Type:p.asset_type,Asset_Version:p.asset_version,Sent_By:p.sent_by||p.owner,Sent_At:p.sent_at||now_(),Channel:p.channel,Recipient_Name:p.recipient_name,Recipient_Role:p.recipient_role,Recipient_Contact:p.recipient_contact,Message_Context:p.message_context,Campaign:p.campaign,Follow_Up_Due:p.follow_up_due,Delivery_Status:p.delivery_status||'SENT',Opened:false,Open_Sessions:0,Catalogue_Viewed:false,Survey_Started:false,Survey_Submitted:false,Interest_Score_Max:0,Follow_Up_Status:p.follow_up_status||'NOT_DUE',Notes:p.notes,Created_At:now_()});}

function refreshAssetMetrics_(lid){
  if(!lid)return;const sessions=sheet_(SESSION_SHEET).getDataRange().getValues(),sx=headers_(sheet_(SESSION_SHEET));let count=0,last='',maxInterest=0,surveyStarted=false,surveySubmitted=false,catalogue=false;
  for(let i=1;i<sessions.length;i++){if(String(sessions[i][sx.idx.Link_ID])!==String(lid))continue;count++;const ls=sessions[i][sx.idx.Last_Seen];if(!last||new Date(ls)>new Date(last))last=ls;maxInterest=Math.max(maxInterest,Number(sessions[i][sx.idx.Interest_Score]||0));surveyStarted=surveyStarted||bool_(sessions[i][sx.idx.Survey_Started]);surveySubmitted=surveySubmitted||bool_(sessions[i][sx.idx.Survey_Submitted]);catalogue=catalogue||String(sessions[i][sx.idx.Entry_Page]||'').indexOf('/catalogue/')>=0||String(sessions[i][sx.idx.Last_Page]||'').indexOf('/catalogue/')>=0;}
  const links=sheet_(LINK_SHEET),lv=links.getDataRange().getValues(),lx=headers_(links);for(let i=1;i<lv.length;i++){if(String(lv[i][lx.idx.Link_ID])!==String(lid))continue;const r=i+1,patch={Updated_At:now_(),Open_Sessions:count,Last_Opened_At:last,Interest_Score_Max:maxInterest,Survey_Started:surveyStarted,Survey_Submitted:surveySubmitted};writePatch_(links,r,lx,patch);break;}
  const sends=sheet_(SEND_SHEET),sv=sends.getDataRange().getValues(),tx=headers_(sends);for(let i=1;i<sv.length;i++){if(String(sv[i][tx.idx.Link_ID])!==String(lid))continue;const r=i+1,patch={Opened:count>0,First_Opened_At:sv[i][tx.idx.First_Opened_At]||last,Last_Opened_At:last,Open_Sessions:count,Catalogue_Viewed:catalogue,Survey_Started:surveyStarted,Survey_Submitted:surveySubmitted,Interest_Score_Max:maxInterest};writePatch_(sends,r,tx,patch);}
}
function writePatch_(s,row,x,obj){Object.keys(obj).forEach(k=>{if(x.idx[k]!==undefined)s.getRange(row,x.idx[k]+1).setValue(obj[k]);});}
function json_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
