
import {BigNumber, ethers} from "ethers";
import {JsonRpcProvider} from "@ethersproject/providers";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

import {pkey} from "./airdrop_wallet_key.json";
import {airdropPool, liquidityPool} from "./config.json";

let poolTreshold: BigNumber = BigNumber.from(airdropPool.treshold+airdropPool.digits);
let gasPrice: BigNumber;
let gasLimit: BigNumber = BigNumber.from("100000000");

export async function performAirdrop(provider: JsonRpcProvider, tokenContract: any){

    /* calc current gas price */
    gasPrice = await getGasPriceFromLastBlock(provider);
    const poolWallet: any = new ethers.Wallet(pkey, provider);
    const db = await open({filename: 'monitor.db', driver: sqlite3.Database});

    /* get token sum of all airdrop candiates */
    let candidateSum: BigNumber = BigNumber.from(0);
    const excludeAddresses = {$owner: await tokenContract.getOwner(), 
                            $distPool: airdropPool.address,
                            $liqPool: liquidityPool.address}
    await db.each("SELECT * FROM balances WHERE LENGTH(balance) > 18 AND address NOT IN ($owner, $distPool, $liqPool)",
                    excludeAddresses,
                    (err:any, row:any) => {candidateSum = candidateSum.add(BigNumber.from(row.balance))});


    /* we need to iterate via for loop over the candidates for the actual airdopping since it is the only 
       way to have control over async calls in a loop. Any other way leads to nonce problems.
    */
    const candidates = await db.all(
                        "SELECT * FROM balances WHERE LENGTH(balance) > 18 AND address NOT IN ($owner, $distPool, $liqPool)",
                        excludeAddresses);

    for(let i: number = 0; i < candidates.length; i++){
        await airdropCallback(candidates[i], tokenContract, poolWallet, candidateSum);
    }
}


async function airdropCallback(row:any, tokenContract: any, poolWallet: any, candidateSum: BigNumber){

    let balance: BigNumber = BigNumber.from(row.balance);
    let address: string = row.address;

    if (address == ethers.constants.AddressZero){
        //tbd
        return;
    }

    let sharePercent: BigNumber = (balance.mul(100)).div(candidateSum);
    let shareActual: BigNumber = (poolTreshold.mul(sharePercent)).div(100);


    try{
        // console.log("---------------------------------------------");
        // console.log("address", address);
        // console.log("balance", balance.toString());
        // console.log("sharePercent", sharePercent.toString());
        // console.log("shareActual", shareActual.toString());

        await tokenContract.connect(poolWallet).transfer(address, shareActual, {gasPrice: gasPrice, gasLimit: gasLimit});
        console.log("done", address);

    }
    catch(e){
        gasPrice = gasPrice.mul(2);
        await tokenContract.connect(poolWallet).transfer(address, shareActual, {gasPrice: gasPrice, gasLimit: gasLimit});
    }
}

/**
 * This functions performs a reverse-loop through the blocks of the chain to find the latest 
 * actual gas price. Since some transactions have a gas fee of '0', we need to search in an 
 * iterative way until we find an actual gas price.
 */
async function getGasPriceFromLastBlock(provider: JsonRpcProvider){
    let blockCounter: number = 0;
    let gasPrice: BigNumber = BigNumber.from(0);

    // reverse-loop through blocks to get the latest actual gas price
    while(true){
        let blockNumber: number = provider._lastBlockNumber - blockCounter;
        let block = await provider._getBlock(blockNumber);

        // inner reverse-loop through the transactions of a block to get the latest acutal gas price
        for (let i:number = block.transactions.length -1; i >= 0; i--){
            let transactionHash = block.transactions[i];
            let transaction = await provider.getTransaction(transactionHash.toString());
            gasPrice = transaction.gasPrice;
            if (gasPrice > BigNumber.from(0)){
                break;
            }
        }
        if (gasPrice > BigNumber.from(0)){
            break;
        }
        else {
            blockCounter++;
        }
    }
    return gasPrice;
}


