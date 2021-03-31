import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TinFitToken } from "../typechain";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;


describe("TinFitToken (Locked Towners/ Burn Owner Tokens)", () => {

    const digits: string = "000000000000000000";
    let token: TinFitToken;
    let accounts: any;
    let owner: any;
    let walletB: any;
    let walletC: any;
    let liquidityPool: any;
    let distributionPool: any;

    beforeEach(async () => {
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
    });

    describe("25% Locked tokens", async() => {
        it("7. owner has 25% of total supply locked in his wallet forever", async() => {

            const lockedAmount: BigNumber = BigNumber.from("250000"+ digits);
            const ownerBalance: BigNumber = await token.balanceOf(owner.address);

            await expect(token.connect(owner).transfer(walletB.address, ownerBalance.sub(lockedAmount).add(1)))
                .to.be.reverted;
            
            const validAmount: BigNumber = ownerBalance.sub(lockedAmount);
            await token.connect(owner).transfer(walletB.address, validAmount);

        });
    });

    describe("Owner can burn until 25% locked tokens", async() => {
        it("owner burns everything except locked tokens", async() => {

            const lockedAmount: BigNumber = BigNumber.from("250000"+ digits);
            const ownerBalanceBefore: BigNumber = await token.balanceOf(owner.address);
            const totalSupplyBefore: BigNumber = await token.totalSupply();

            const validAmount: BigNumber = ownerBalanceBefore.sub(lockedAmount);
            await token.connect(owner).ownerBurn(validAmount);

            const ownerBalanceAfter: BigNumber = await token.balanceOf(owner.address);
            const totalSupplyAfter: BigNumber = await token.totalSupply();

            expect(ownerBalanceAfter).to.eq(ownerBalanceBefore.sub(validAmount));
            expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(validAmount));

        });

        it("owner cannot burn locked tokens", async() => {

            const lockedAmount: BigNumber = BigNumber.from("250000"+ digits);
            const ownerBalanceBefore: BigNumber = await token.balanceOf(owner.address);
            const totalSupplyBefore: BigNumber = await token.totalSupply();

            const amount: BigNumber = ownerBalanceBefore.sub(lockedAmount).add(1);
            await expect(token.connect(owner).ownerBurn(amount)).to.be.reverted;
        });
    });
});