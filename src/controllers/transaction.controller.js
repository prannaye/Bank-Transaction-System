const transactionModel = require("../models/transaction.model")
const ledgerModel = require("../models/ledger.model")
const emailService = require("../services/email.service")
const accountModel = require("../models/account.model")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * The 10 STEP TRANSFER FLOW
    * 1. Validate request
    * 2. Validate Idempotency key
    * 3. Check account status
    * 4. Derive sender balance from ledger
    * 5. Create transaction (PENDING)
    * 6. Create DEBIT ledger entry
    * 7. Create CREDIT ledger entry
    * 8. Mark transaction COMPLETED
    * 9. Comit MongoDB session 
    * 10. Sen email Notification 
 */


async function createTransaction(req,res){
    /**
     * 1. Validate request
     * the incooming data which is coming to us means the request of transferring
     * money is the data right or not is the data able to validate or not
     */

    const {fromAccount,toAccount,amount,idempotencyKey} = req.body

    if((!toAccount || !amount || !idempotencyKey || !fromAccount)){
        return res.status(400).json({
            message: "fromAccount , toAccount , amount and idempotencyKey are required"
        })    
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })
    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if((!toAccount || !fromAccount)){
        return res.status(400).json({
            message: "Invalid fromAccount or toAccount"
        })    
    }

    /**
     * 2.Validate idempotency key
     */

    const isTransacctionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })
    if(isTransacctionAlreadyExists){
        if(isTransacctionAlreadyExists.status == "COMPLETED"){
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransacctionAlreadyExists
            })  
        }
        if(isTransacctionAlreadyExists.status =="PENDING"){
            return res.status(200).json({
                message: "Transaction is still processing"
            })
        }
        if(isTransacctionAlreadyExists.status =="FAILED"){
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }
        if(isTransacctionAlreadyExists.status =="REVERSED"){
            return res.status(500).json({
                message: "Transaction is reversed, please retry"
            })
        }

    }
    /**
     * 3. Check Account status
     */

    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
                message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
            })
    }

    /**
     * 4.Derive sender balance from ledger
     */

    const balance = await fromUserAccount.getBalance()

    if(balance<amount){
        return res.status(400).json({
            message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
        })
    }
    let transaction;
    try{

    /**
     * 5.Create Transaction(PENDING)
     */
    const session = await mongoose.startSession()
    session.startTransaction()

    transaction = (await transactionModel.create([{
        fromAccount,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    }],{session}))[0]

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromAccount,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }],{session})

    // await (()=>{
    //     return new Promise((resolve) => setTimeout(resolve,100*1000))
    // })()


    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }],{session})

    await transactionModel.findOneAndUpdate(
        {_id:transaction._id},
        {status:"COMPLETED"},
        {session}
    )
        

    await session.commitTransaction()
    session.endSession()
    }
    catch(error){
        await transactionModel.findOneAndUpdate(
            {idempotencyKey:idempotencyKey},
            {status:"FAILED"}
        )
        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after some time",
        })
    }
    /**
     * 10.Send email Notification
     */
    await emailService.sendTransactionEmail(req.user.email,req.user.name,amount,toAccount)

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction: transaction 
    })
}


async function createInitialFundsTransaction(req,res){
    const {toAccount,amount,idempotencyKey} = req.body


    if((!toAccount || !amount || !idempotencyKey)){
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })    
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if(!toUserAccount){
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }


    const fromUserAccount = await accountModel.findOne({
        systemUser: true,
        user: req.user._id
    })

    if(!fromUserAccount){
        return res.status(400).json({
            message: "System user Account not found"
        })
    }


    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"

    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }],{session})

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }],{session})


    transaction.status = "COMPLETED"
    await transaction.save({session})

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfuly",
        transaction: transaction
    })
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}