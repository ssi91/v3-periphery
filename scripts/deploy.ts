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
    }
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

    const weth9 = await deployContractFromArtifact(signer, initialConfig.weth9.artifactPath)
    await weth9.deployed()
    console.log(weth9.address)

    const factory = await deployContractFromArtifact(signer, initialConfig.factory.artifactPath)
    await factory.deployed()
    console.log(factory.address)

    const RouterFactory = await ethers.getContractFactory("SwapRouter")
    const router = await RouterFactory.deploy(factory.address, weth9.address)
    await router.deployed()
    console.log(router.address)
}

main().then(() => process.exit(0))
