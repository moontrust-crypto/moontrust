async function main() {

    const signers = await ethers.getSigners();

    const deployer = signers[0];
    const liqPool = signers[8];
    const distPool = signers[9];
  
    console.log(
      "Deploying contracts with the account:",
      deployer.address
    );
    
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const digits = "000000000000000000";
    const supply = ethers.BigNumber.from("1000000" + digits);

    const Token = await ethers.getContractFactory("TinFitToken", deployer);
    const token = await Token.deploy(supply, liqPool.address, distPool.address);
  
    console.log("Token address:", token.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });