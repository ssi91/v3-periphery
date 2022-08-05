import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/src/signers";
import fs from "fs";
import {Contract} from "ethers";

const hre = require('hardhat')
const ethers = hre.ethers

let initialConfig = {
    factory: {
        artifactPath: "",
    },
    weth9: {
        artifactPath: "",
    },
    nativeTokenSymbol: "",
}

async function deployContractFromArtifact(signer: SignerWithAddress, artifactPath: string): Promise<Contract> {
    let getArtifact = (artifactPath: string): { abi: object, bytecode: object } => {
        try {
            let data = fs.readFileSync(artifactPath)
            return JSON.parse(data.toString())
        } catch (e) {
            throw "Wrong Source Path: " + e.message + " " + artifactPath
        }
    }

    const artifact = getArtifact(artifactPath)
    return await hre.waffle.deployContract(signer, {
        abi: artifact.abi,
        bytecode: artifact.bytecode
    })
}

async function main() {
    const [signer] = await ethers.getSigners()

    // WETH9
    const weth9 = await deployContractFromArtifact(signer, initialConfig.weth9.artifactPath)
    await weth9.deployed()
    console.log("WETH9", weth9.address)

    // Factory Contract
    const factory = await deployContractFromArtifact(signer, initialConfig.factory.artifactPath)
    await factory.deployed()
    console.log("Factory", factory.address)

    // Router
    const RouterFactory = await ethers.getContractFactory("SwapRouter")
    const router = await RouterFactory.deploy(factory.address, weth9.address)
    await router.deployed()
    console.log("Router", router.address)

    const NFTDescFactory = await ethers.getContractFactory("NFTDescriptor")
    const nftDesc = await NFTDescFactory.deploy()
    await nftDesc.deployed()
    console.log("NFT Descriptor", nftDesc.address)

    const PositionManagerDescFactory = await ethers.getContractFactory("NonfungibleTokenPositionDescriptor", {
        libraries: {
            NFTDescriptor: nftDesc.address
        }
    })
    const positionManagerDescriptor = await PositionManagerDescFactory.deploy(
        weth9.address,
        ethers.utils.formatBytes32String(initialConfig.nativeTokenSymbol)
    )
    console.log("Position Manager Descriptor: ", positionManagerDescriptor.address)

    // NFT Position manager
    const PositionManagerFactory = await ethers.getContractFactory("NonfungiblePositionManager")
    const positionManager = await PositionManagerFactory.deploy(
        factory.address,
        weth9.address,
        positionManagerDescriptor.address
    )
    await positionManager.deployed()
    console.log("Position Manager", positionManager.address)
}

main().then(() => process.exit(0))
