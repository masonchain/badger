// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`. When running the script with `npx hardhat run <script>` you'll find the Hardhat Runtime Environment's members available in the global scope.

// to verify, run: 'npx hardhat verify ==constructor-args scripts/arguments.js CONTRACT_ADDRESS --network rinkeby 

const hre = require("hardhat");

const { assert } = require('chai');
const { getChainId, ethers } = require("hardhat");

async function main() {
    // Compiling all of the contracts again just in case
    await hre.run('compile');

    const [deployer] = await ethers.getSigners();
    console.log(`✅ Connected to ${deployer.address}`);
    
    const chainId = await hre.getChainId();
    
    /*//////////////////////////////////////////////////////////////
                        DEPLOYING BASE CONTRACTS
    //////////////////////////////////////////////////////////////*/

    const BadgerSash = await ethers.getContractFactory("BadgerSash");
    sashMaster = await BadgerSash.deploy();
    sashMaster = await sashMaster.deployed();

    const BadgerHouse = await ethers.getContractFactory("BadgerHouse");
    house = await BadgerHouse.deploy(sashMaster.address);
    house = await house.deployed();

    // Verifying
    if (chainId != '31337') {
        // Give time for etherscan to confirm the contract before verifying.
        await new Promise(r => setTimeout(r, 30000));
        await hre.run("verify:verify", {
            address: sashMaster.address,
            constructorArguments: [],
        });
        await hre.run("verify:verify", {
            address: house.address,
            contructorArguments: [
                sashMaster.address
            ]
        })
        console.log("✅ House Verified.")
    }


    console.table({
        "Chain ID": chainId,
        "Deployer": deployer.address,
        "House Address": house.address,
        "Remaining ETH Balance": parseInt((await deployer.getBalance()).toString()) / 1000000000000000000,
    })


    /*//////////////////////////////////////////////////////////////
                        DEPLOYING CLONE
    //////////////////////////////////////////////////////////////*/
    // TODO: proper uri
    cloneTx = await house.connect(deployer).createSashPress("");
    cloneTx = await cloneTx.wait();
    
    sashPressAddress = cloneTx.events[0].address;
    sashPress = await sashMaster.attach(sashPressAddress);

    assert.equal(await sashPress.owner(), deployer.address);

    console.table({
        "Chain ID": chainId,
        "Deployer": sashPress.address,
        "House Address": house.address,
        "Remaining ETH Balance": parseInt((await deployer.getBalance()).toString()) / 1000000000000000000,
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });