import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TinFitToken } from "../typechain";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;


describe("TinFitToken (Base Tax)", () => {

    const digits: string = "000000000000000000";
    let token: TinFitToken;
    let accounts: any;
    let owner: any;
    let walletB: any;
    let walletC: any;
    let liquidityPool: any;
    let distributionPool: any;

    before(async () => {
        accounts = await ethers.getSigners();

        owner = accounts[0];
        walletB = accounts[1];
        walletC = accounts[2];

        liquidityPool = accounts[8];
        distributionPool = accounts[9];

        const tokenFactory = await ethers.getContractFactory("TinFitToken", owner);
        const supply: BigNumber = BigNumber.from("1000000" + digits);

        token = (await tokenFactory.deploy(supply, liquidityPool.address, distributionPool.address)) as TinFitToken;
        await token.deployed();

        // expect(await token.name()).to.eq("BEP Token");
        // expect(await token.symbol()).to.eq("BPT");
        expect(await token.getOwner()).to.eq(owner.address);
        expect(await token.decimals()).to.eq(18);

        expect(await token.totalSupply()).to.eq(supply);
        expect(await token.balanceOf(owner.address)).to.eq(supply);

        await token.connect(owner).transfer(walletB.address, BigNumber.from("500000" + digits));
    });

    it("Transfer value <= 1.000 : 0% taxes", async () => {

        let senderBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceBefore: BigNumber = await token.balanceOf(walletC.address);

        let transferAmount: BigNumber = BigNumber.from("1000" + digits);
        await token.connect(walletB).transfer(walletC.address, transferAmount);

        let senderBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceAfter: BigNumber = await token.balanceOf(walletC.address);

        expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
        expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount));

    });

    it("Transfer 1.000 > value < 10.000 : 5% taxes", async () => {

        let senderBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceBefore: BigNumber = await token.balanceOf(walletC.address);

        let transferAmount: BigNumber = BigNumber.from("2000" + digits);
        let expectedTaxes: BigNumber = BigNumber.from("100" + digits);
        await token.connect(walletB).transfer(walletC.address, transferAmount);

        let senderBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceAfter: BigNumber = await token.balanceOf(walletC.address);

        expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
        expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount.sub(expectedTaxes)));
    });


    it("Transfer 10.000 > value < 100.000 : 10% taxes", async () => {

        let senderBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceBefore: BigNumber = await token.balanceOf(walletC.address);

        let transferAmount: BigNumber = BigNumber.from("20000" + digits);
        let expectedTaxes: BigNumber = BigNumber.from("2000" + digits);
        await token.connect(walletB).transfer(walletC.address, transferAmount);

        let senderBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceAfter: BigNumber = await token.balanceOf(walletC.address);

        expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
        expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount.sub(expectedTaxes)));
    });

    it("Transfer value > 100.000 : 15% taxes", async () => {

        let senderBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceBefore: BigNumber = await token.balanceOf(walletC.address);

        let transferAmount: BigNumber = BigNumber.from("150000" + digits);
        let expectedTaxes: BigNumber = BigNumber.from("22500" + digits);
        await token.connect(walletB).transfer(walletC.address, transferAmount);

        let senderBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceAfter: BigNumber = await token.balanceOf(walletC.address);

        expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
        expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount.sub(expectedTaxes)));
    });

});