import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TinFitToken } from "../typechain";
import { BigNumber } from "ethers";

chai.use(solidity);
const { expect } = chai;


describe("TinFitToken (Tax Multiplicator: 2)", () => {

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

        // set tax rate multiplicator to 200%
        await token.connect(owner).setTaxMultiplicator(200);
    });



    it("2. Owner whitelisted in transaction fee mechanism", async () => {
        expect(await token.isSenderWhitelisted(owner.address)).to.be.true;
        expect(await token.isReceiverWhitelisted(owner.address)).to.be.true;

    });

    it("3. Owner wallet will send 100000 token to wallet B", async () => {
        let senderBalanceBefore: BigNumber = await token.balanceOf(owner.address);
        let receiverBalanceBefore: BigNumber = await token.balanceOf(walletB.address);

        let transferAmount: BigNumber = BigNumber.from("100000" + digits);
        await token.connect(owner).transfer(walletB.address, transferAmount);

        let senderBalanceAfter: BigNumber = await token.balanceOf(owner.address);
        let receiverBalanceAfter: BigNumber = await token.balanceOf(walletB.address);

        expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
        expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount));
    });

    it("4. Wallet B sends 50000 token to wallet C", async () => {
        let senderBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceBefore: BigNumber = await token.balanceOf(walletC.address);
        let liqPoolBalanceBefore: BigNumber = await token.balanceOf(liquidityPool.address);
        let distPoolBalanceBefore: BigNumber = await token.balanceOf(distributionPool.address);


        let transferAmount: BigNumber = BigNumber.from("50000" + digits);
        let expectedTax: BigNumber = BigNumber.from("10000" + digits);
        await token.connect(walletB).transfer(walletC.address, transferAmount);

        let senderBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
        let receiverBalanceAfter: BigNumber = await token.balanceOf(walletC.address);
        let liqPoolBalanceAfter: BigNumber = await token.balanceOf(liquidityPool.address);
        let distPoolBalanceAfter: BigNumber = await token.balanceOf(distributionPool.address);

        expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
        expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount.sub(expectedTax)));
        expect(liqPoolBalanceAfter).to.eq(liqPoolBalanceBefore.add(expectedTax.div(2)));
        expect(distPoolBalanceAfter).to.eq(distPoolBalanceBefore.add(expectedTax.div(2)));
    });

    describe("5. Must be able to whitelist wallets for tax bypass", async () => {

        it("Wallet B (sender whitelist) sends 50000 tokens to wallet C", async() => {

            let transferAmount: BigNumber = BigNumber.from("50000" + digits);
            await token.connect(owner).transfer(walletB.address, transferAmount);
            await token.connect(owner).addToSenderWhitelist(walletB.address);
            let senderBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
            let receiverBalanceBefore: BigNumber = await token.balanceOf(walletC.address);
    
            await token.connect(walletB).transfer(walletC.address, transferAmount);

            let senderBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
            let receiverBalanceAfter: BigNumber = await token.balanceOf(walletC.address);
    
            expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
            expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount));

        })

        it("Wallet C sends 50000 tokens to wallet B (sender whitelist)", async() => {

            let senderBalanceBefore: BigNumber = await token.balanceOf(walletC.address);
            let receiverBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
    
            let transferAmount: BigNumber = BigNumber.from("50000" + digits);
            let expectedTax: BigNumber = BigNumber.from("10000" + digits);
            await token.connect(walletC).transfer(walletB.address, transferAmount);

            let senderBalanceAfter: BigNumber = await token.balanceOf(walletC.address);
            let receiverBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
    
            expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
            expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount.sub(expectedTax)));

        })

        it("Wallet C sends 50000 tokens to wallet B (sender & receiver whitelist)", async() => {

            let transferAmount: BigNumber = BigNumber.from("50000" + digits);
            await token.connect(owner).transfer(walletC.address, transferAmount);
            await token.connect(owner).addToReceiverWhitelist(walletB.address);
            let senderBalanceBefore: BigNumber = await token.balanceOf(walletC.address);
            let receiverBalanceBefore: BigNumber = await token.balanceOf(walletB.address);
    
            await token.connect(walletC).transfer(walletB.address, transferAmount);

            let senderBalanceAfter: BigNumber = await token.balanceOf(walletC.address);
            let receiverBalanceAfter: BigNumber = await token.balanceOf(walletB.address);
    
            expect(senderBalanceAfter).to.eq(senderBalanceBefore.sub(transferAmount));
            expect(receiverBalanceAfter).to.eq(receiverBalanceBefore.add(transferAmount));
        })
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
});