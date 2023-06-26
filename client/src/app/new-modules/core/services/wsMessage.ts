import { WSMessage, DatasetListReq,DatasetListResp,DatasetReq,DatasetResp,UserDetailsReq,UserDetailsResp,UserDetailsUpd,SetUserDetailsReq,SetUserDetailsResp } from "src/app/generated-protos/proto/apistructs";

export function makeWSMessage(msg: DatasetListReq|DatasetListResp|DatasetReq|DatasetResp|UserDetailsReq|UserDetailsResp|UserDetailsUpd|SetUserDetailsReq|SetUserDetailsResp): WSMessage {
	let wsmsg: WSMessage = {} as WSMessage;

    if(typeof(msg) == typeof(DatasetListReq)) {
        wsmsg.datasetListReq = msg as DatasetListReq;
    } else if(typeof(msg) == typeof(DatasetListResp)) {
        wsmsg.datasetListResp = msg as DatasetListResp;
    } else if(typeof(msg) == typeof(DatasetReq)) {
        wsmsg.datasetReq = msg as DatasetReq;
    } else if(typeof(msg) == typeof(DatasetResp)) {
        wsmsg.datasetResp = msg as DatasetResp;
    } else if(typeof(msg) == typeof(UserDetailsReq)) {
        wsmsg.userDetailsReq = msg as UserDetailsReq;
    } else if(typeof(msg) == typeof(UserDetailsResp)) {
        wsmsg.userDetailsResp = msg as UserDetailsResp;
    } else if(typeof(msg) == typeof(UserDetailsUpd)) {
        wsmsg.userDetailsUpd = msg as UserDetailsUpd;
    } else if(typeof(msg) == typeof(SetUserDetailsReq)) {
        wsmsg.setUserDetailsReq = msg as SetUserDetailsReq;
    } else if(typeof(msg) == typeof(SetUserDetailsResp)) {
        wsmsg.setUserDetailsResp = msg as SetUserDetailsResp;
    }
    return wsmsg;
}