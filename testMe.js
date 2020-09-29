const WAPI = require('./weatherFlowDataGetter');
const actObj = require('./actObj.json');

const wApi = new WAPI(actObj.apiKey, actObj.deviceId, true);

let now = new Date();

console.log('Current time as Epoc = ' + Math.round(now.getTime() / 1000))

let x = now.setDate(now.getDate() + 3);
x = Math.round(x / 1000);
console.log('Epoc for 3 days in future ' + x);

now = new Date();
let lastNight = new Date(now.setDate(now.getDate() - 2))
let y = new Date(lastNight.setHours(23,59,00));

console.log('Last Night at Midnight = ' + y + ' Epoc end time = ' + Math.round(y.getTime() / 1000) + ' start time = ' + (Math.round(y.getTime() / 1000) - 1))

wApi.getCurrent()
.then((rslt)=>{
    console.log('getCurrent complete result follows:');
    console.dir(rslt, {depth:null});
    console.log('our standard weather object:')
    console.dir(wApi.data, {depth:null})
    wApi.getForecast()
    .then((rslt) => {
        console.log('now with forecast data:')
        console.dir(wApi.data, {depth:null})
    })
})
.catch((err)=>{
    console.error('Error calling wApi:', err);
    
})

