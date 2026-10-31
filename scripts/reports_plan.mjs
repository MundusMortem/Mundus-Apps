import { deliveryPlan,validateConfig } from '../apps/reports/model.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {config,data,state,now}=JSON.parse(input);
process.stdout.write(JSON.stringify({...deliveryPlan(config,data,state,now),config:validateConfig(config)}));
