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

}

main().then(() => process.exit(0))
