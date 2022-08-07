import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/src/signers";
import fs from "fs";
import {Contract} from "ethers";
import {initialConfig} from "./initialConfig";
import {TupleType} from "typechain";
import {any} from "hardhat/internal/core/params/argumentTypes";

const hre = require('hardhat')
const ethers = hre.ethers


async function deployContractFromArtifact(signer: SignerWithAddress, artifactPath: string): Promise<[Contract, Array<object>]> {
    let getArtifact = (artifactPath: string): { abi: Array<object>, bytecode: string } => {
        try {
            let data = fs.readFileSync(artifactPath)
            return JSON.parse(data.toString())
        } catch (e) {
            throw "Wrong Source Path: " + e.message + " " + artifactPath
        }
    }

    const artifact = getArtifact(artifactPath)
    return [
        await hre.waffle.deployContract(signer, {
            abi: artifact.abi,
            bytecode: artifact.bytecode
        }),
        artifact.abi
    ]
}

async function main() {
    const [signer] = await ethers.getSigners()

    let generalConfig = {
        factory: {
            abi: [{}],
            address: ""
        },
        weth9: {
            abi: [{}],
            address: ""
        },
        router: {
            abi: [{}],
            address: ""
        },
        NFTDescriptorLib: {
            abi: [{}],
            address: ""
        },
        positionManagerDescriptor: {
            abi: [{}],
            address: ""
        },
        positionManager: {
            abi: [{}],
            address: ""
        }
    }

    // WETH9
    const [weth9, weth9Abi] = await deployContractFromArtifact(signer, initialConfig.weth9.artifactPath)
    await weth9.deployed()
    console.log("WETH9", weth9.address)
    generalConfig.weth9.address = weth9.address
    generalConfig.weth9.abi = weth9Abi

    // Factory Contract
    const [factory, factoryAbi] = await deployContractFromArtifact(signer, initialConfig.factory.artifactPath)
    await factory.deployed()
    console.log("Factory", factory.address)
    generalConfig.factory.address = factory.address
    generalConfig.factory.abi = factoryAbi

    // Router
    const RouterFactory = await ethers.getContractFactory("SwapRouter")
    const router = await RouterFactory.deploy(factory.address, weth9.address)
    await router.deployed()
    console.log("Router", router.address)
    const routerAbi = JSON.parse(RouterFactory.interface.format(ethers.utils.FormatTypes.json))
    generalConfig.router.address = router.address
    generalConfig.router.abi = routerAbi

    const NFTDescFactory = await ethers.getContractFactory("NFTDescriptor")
    const nftDesc = await NFTDescFactory.deploy()
    await nftDesc.deployed()
    console.log("NFT Descriptor", nftDesc.address)
    const nftDescAbi = JSON.parse(NFTDescFactory.interface.format(ethers.utils.FormatTypes.json))
    generalConfig.NFTDescriptorLib.address = nftDesc.address
    generalConfig.NFTDescriptorLib.abi = nftDescAbi

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
    const positionManagerDescriptorAbi = JSON.parse(PositionManagerDescFactory.interface.format(ethers.utils.FormatTypes.json))
    generalConfig.positionManagerDescriptor.address = positionManagerDescriptor.address
    generalConfig.positionManagerDescriptor.abi = positionManagerDescriptorAbi

    // NFT Position manager
    const PositionManagerFactory = await ethers.getContractFactory("NonfungiblePositionManager")
    const positionManager = await PositionManagerFactory.deploy(
        factory.address,
        weth9.address,
        positionManagerDescriptor.address
    )
    await positionManager.deployed()
    console.log("Position Manager", positionManager.address)
    const positionManagerAbi = JSON.parse(PositionManagerFactory.interface.format(ethers.utils.FormatTypes.json))
    generalConfig.positionManager.address = positionManager.address
    generalConfig.positionManager.abi = positionManagerAbi
}

main().then(() => process.exit(0))
