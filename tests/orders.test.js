const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const ejs = require("ejs");
const {createPayments} = require("../payments");
const {isEmail} = require("../booking-email");
const source = fs.readFileSync(require.resolve("../server"),"utf8");
const order = {_id:"123456",requesterName:"Guest",requesterEmail:"guest@example.com",phone:"0723548397",items:[{name:"Pilau",quantity:20}],total:5500,deliveryFee:500,quoted:true,paymentReference:"ref-1",paymentMethod:"M-PESA",accessToken:"a".repeat(64),status:"Confirmed",paymentStatus:"Pending",deliveryAddress:"Nairobi"};
test("checkout uses server amount and selected channel; verification rejects mismatches",async()=>{
  let body;
  let data = {status:"success",reference:"ref-1",currency:"KES",amount:550000,customer:{email:order.requesterEmail}};
  const gateway = createPayments({PAYSTACK_SECRET_KEY:"test",PUBLIC_BASE_URL:"https://example.com"},async(url,opts)=>{
    if(opts.body) body=JSON.parse(opts.body);
    return {ok:true,json:async()=>({status:true,data})};
  });
  await gateway.initialize(order);
  assert.equal(body.amount,550000);assert.deepEqual(body.channels,["mobile_money"]);
  await gateway.initialize({...order,paymentMethod:"Card"});assert.deepEqual(body.channels,["card"]);
  assert.ok(await gateway.verify(order));
  for(const change of [{amount:1},{currency:"USD"},{reference:"wrong"},{status:"pending"},{customer:{email:"other@example.com"}}]) {
    const original=data;data={...data,...change};assert.equal(await gateway.verify(order),false);data=original;
  }
});
test("webhook signatures reject forged or malformed payloads",()=>{
  const gateway=createPayments({PAYSTACK_SECRET_KEY:"secret"});
  const payload=Buffer.from('{"event":"charge.success"}');
  const signature=crypto.createHmac("sha512","secret").update(payload).digest("hex");
  assert.ok(gateway.validSignature(payload,signature));
  assert.ok(!gateway.validSignature(Buffer.from("changed"),signature));
  assert.ok(!gateway.validSignature(payload,"bad"));
});
test("unpaid orders cannot be prepared or delivered; admin cannot manually mark payment paid",async()=>{
  for(const status of ["Preparing","Ready for dispatch","Out for delivery","Delivered","Confirmed"]) {
    let handler,saves=0;
    const record={...order,save:async()=>{saves++;}};
    vm.runInNewContext(source.slice(source.indexOf('app.post("/admin/orders/:id"'),source.indexOf('app.get("/health"')),{
      app:{post:(path,auth,callback)=>{handler=callback;}},requireAdmin(){},
      Order:{findById:()=>({populate:async()=>record})},flash(){},bookingMailer:{}
    });
    await handler({params:{id:"123456"},body:{status,paymentStatus:"Paid"}},{redirect(){}},error=>{throw error;});
    assert.equal(saves,status === "Confirmed" ? 1 : 0);assert.equal(record.paymentStatus,"Pending");
  }
});
test("guest food requests use stored service prices and create a private link",async()=>{
  let handler,created,redirect;
  vm.runInNewContext(source.slice(source.indexOf('app.post("/order/:id",'),source.indexOf('app.get("/requests/:token",')) ,{
    app:{post:(path,callback)=>{handler=callback;}},
    Service:{findOne:async()=>({_id:"service",name:"Pilau",price:200,quoteOnly:false})},
    Order:{create:async data=>{created=data;return {...data,save:async()=>{}};}},isEmail,crypto,
    adminNotifier:{notify:async()=>({email:"Accepted",whatsapp:"Not configured"})},process:{env:{}},flash(){}
  });
  await handler({params:{id:"service"},session:{},body:{requesterName:"Guest",requesterEmail:"guest@example.com",phone:"0723548397",quantity:"20",deliveryAddress:"Nairobi",paymentMethod:"M-PESA",total:"1"}},{redirect:path=>{redirect=path;}},error=>{throw error;});
  assert.equal(created.total,4000);assert.equal(created.customer,undefined);
  assert.match(created.accessToken,/^[a-f0-9]{64}$/);assert.equal(redirect,"/requests/"+created.accessToken);
});
test("order forms, private tracking and admin views render",async()=>{
  const locals={title:"Test",currentUser:null,flash:null,year:2026,currency:String,service:{_id:"123456",name:"Pilau",price:0,quoteOnly:true},order,paymentsConfigured:false,bookings:[],orders:[order],services:[],customers:0,stats:{},bookingStatuses:[],emailConfigured:false};
  for(const page of ["order","request","admin"]) {
    const html=await ejs.renderFile(`views/${page}.ejs`,locals);
    assert.ok(html.length>1000);
    if(page==="request")assert.ok(html.includes("awaiting setup"));
    if(page==="admin")assert.ok(!html.includes('name="paymentStatus"'));
  }
});
