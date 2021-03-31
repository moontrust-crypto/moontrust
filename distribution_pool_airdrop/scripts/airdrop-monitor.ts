
import {BigNumber, ethers} from "ethers";
import {JsonRpcProvider} from "@ethersproject/providers";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import {abi} from "./abi.json";
import {network, token, airdropPool} from "./config.json";
import {performAirdrop} from "./airdrop";

let airdropProcessing: boolean = false;
let poolTreshold: BigNumber = BigNumber.from(airdropPool.treshold+airdropPool.digits);

/**
 * Store/Update the balance information of 'Transfer' participants into the database.
 * Also update the database with the latest transaction and block.
 */
async function monitorCallback(provider: JsonRpcProvider, tokenContract: any, from: string, to: string){

    const currentBlock: number = await provider.getBlockNumber();
    const fromBalance: BigNumber = await tokenContract.balanceOf(from); 
    const toBalance: BigNumber = await tokenContract.balanceOf(to); 

    const serializeObj = [{$address: from, $balance: fromBalance, $block: currentBlock},
                          {$address: to, $balance: toBalance, $block: currentBlock}];
    console.log(serializeObj);

    const db = await open({filename: 'monitor.db', driver: sqlite3.Database});

    serializeObj.forEach(obj => {
        db.run("INSERT OR REPLACE INTO balances (address, balance, latest_block) VALUES ($address, $balance, $block)", obj)
    });
}

async function checkAirdropTresholdReached(provider: JsonRpcProvider, tokenContract: any){
    console.log("check treshold");
    let poolBalance: BigNumber = await tokenContract.balanceOf(airdropPool.address);

    if (poolBalance.gte(poolTreshold)){
        console.log("treshold reached!");
        airdropProcessing = true;
        await performAirdrop(provider, tokenContract);
    }
    airdropProcessing = false;
}

/**
 * Listen to 'Transfer' events of the token and trigger the callback once such an event has been detected.
 */
async function listenToTokenTransfer(){
    let provider: JsonRpcProvider = new ethers.providers.JsonRpcProvider(network);
    let tokenContract = new ethers.Contract(token.address, abi, provider);
    console.log("started");
    tokenContract.on("Transfer", (from, to, value) => {
        monitorCallback(provider, tokenContract, from, to);

        console.log("airdrop processing:", airdropProcessing);
        if (!airdropProcessing){
            checkAirdropTresholdReached(provider, tokenContract);
        }
    });

}

listenToTokenTransfer();