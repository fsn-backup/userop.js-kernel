import {
    encodeFunctionData,
    toBytes,
    concat,
    pad,
    toHex,
    keccak256,
    encodeAbiParameters,
    concatHex,
    zeroAddress,
    decodeFunctionData,
    isHex,
    hexToBigInt,
    getFunctionSelector,
    getContract
} from "viem";

import {
    getUserOperationHash,
    type Address,
    type Hex,
    type SmartAccountSigner,
    type UserOperationRequest,
    getChain,
    type SignTypedDataParams,
} from "@alchemy/aa-core";



export enum ParamCondition {
    EQUAL = 0,
    GREATER_THAN = 1,
    LESS_THAN = 2,
    GREATER_THAN_OR_EQUAL = 3,
    LESS_THAN_OR_EQUAL = 4,
    NOT_EQUAL = 5,
}
export interface ParamRules {
    offset: number;
    condition: ParamCondition;
    param: Hex;
}
export enum Operation {
    Call = 0,
    DelegateCall = 1,
}
export interface Permission {
    target: Address;
    valueLimit: number;
    sig: Hex;
    rules: ParamRules[];
    operation: Operation;
}
export function encodePermissionData(permission: Permission, merkleProof?: string[]): Hex {
    const permissionParam = {
        components: [
            {
                name: "target",
                type: "address",
            },
            {
                name: "valueLimit",
                type: "uint256",
            },
            {
                name: "sig",
                type: "bytes4",
            },
            {
                components: [
                    {
                        name: "offset",
                        type: "uint256",
                    },
                    {
                        internalType: "enum ParamCondition",
                        name: "condition",
                        type: "uint8",
                    },
                    {
                        name: "param",
                        type: "bytes32",
                    },
                ],
                name: "rules",
                type: "tuple[]",
            },
            {
                internalType: "enum Operation",
                name: "operation",
                type: "uint8",
            },
        ],
        name: "permission",
        type: "tuple",
    };
    let params;
    let values;
    if (merkleProof) {
        params = [
            permissionParam,
            {
                name: "merkleProof",
                type: "bytes32[]",
            },
        ];
        values = [permission, merkleProof];
    } else {
        params = [permissionParam];
        values = [permission];
    }
    return encodeAbiParameters(params, values);
}
