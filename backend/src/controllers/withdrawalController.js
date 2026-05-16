import mongoose from "mongoose";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { catchAsync } from "./catchAsync.js";

export const requestWithdrawal = catchAsync(async (req, res) => {
  const { amount, accountNumber, bankName, accountName } = req.body;
  const userId = req.user?.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user || user.balance < amount) {
      await session.abortTransaction();
      res.status(400).json({ message: "Insufficient balance" });
      return;
    }

    if (amount < 1000) {
      await session.abortTransaction();
      res.status(400).json({ message: "Minimum withdrawal is ₦1,000" });
      return;
    }

    // Deduct from balance
    user.balance -= amount;
    await user.save({ session });

    const request = await WithdrawalRequest.create(
      [
        {
          userId: user._id,
          amount,
          accountNumber,
          bankName,
          accountName,
          status: "pending",
        },
      ],
      { session },
    );

    // Create transaction record
    await Transaction.create(
      [
        {
          userId: user._id,
          amount,
          type: "debit",
          description: `Withdrawal Request (Pending): ${bankName} - ${accountNumber}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.status(201).json(request[0]);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
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
