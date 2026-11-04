import mongoose from "mongoose";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { catchAsync } from "./catchAsync.js";

export const requestWithdrawal = catchAsync(async (req, res) => {
  const { amount, accountNumber, bankName, accountName } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount < 1000) {
    res.status(400).json({ message: "Minimum withdrawal is ₦1,000" });
    return;
  }

  if (!accountNumber || !bankName || !accountName) {
    res.status(400).json({ message: "All bank account details are required." });
    return;
  }

  const user = await User.findById(userId);
  if (!user || user.balance < numAmount) {
    res.status(400).json({ message: "Insufficient balance" });
    return;
  }

  // Deduct balance from user
  const previousBalance = user.balance;
  user.balance -= numAmount;
  await user.save();

  let requestDoc;
  try {
    requestDoc = await WithdrawalRequest.create({
      userId: user._id,
      amount: numAmount,
      accountNumber: String(accountNumber).trim(),
      bankName: String(bankName).trim(),
      accountName: String(accountName).trim(),
      status: "pending",
    });

    // Create transaction record
    await Transaction.create({
      userId: user._id,
      amount: numAmount,
      type: "debit",
      description: `Withdrawal Request (Pending): ${bankName} - ${accountNumber}`,
    });
  } catch (err) {
    // Rollback balance deduction if document creation fails
    user.balance = previousBalance;
    await user.save();
    throw err;
  }

  res.status(201).json(requestDoc);
});

export const getMyWithdrawals = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const requests = await WithdrawalRequest.find({ userId }).sort({
    createdAt: -1,
  });
  res.json(requests);
});
