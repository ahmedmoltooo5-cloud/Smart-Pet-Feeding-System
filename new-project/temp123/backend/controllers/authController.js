import bcrypt from "bcryptjs";
import { FeedingHistory, User } from "../models/index.js";
import { generateAuthToken, sanitizeUser } from "../services/authService.js";
import { ApiError } from "../utils/apiError.js";

export async function signup(req, res) {
  const { petName, petDetails, ownerPhone, password } = req.body;

  const existingUser = await User.findOne({
    where: {
      petName,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "Pet name already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    petName,
    petDetails,
    ownerPhone,
    passwordHash,
  });

  res.status(201).json({
    token: generateAuthToken(user),
    user: sanitizeUser(user),
  });
}

export async function login(req, res) {
  const { petName, password } = req.body;

  const user = await User.findOne({
    where: {
      petName,
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid pet name or password.");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid pet name or password.");
  }

  res.json({
    token: generateAuthToken(user),
    user: sanitizeUser(user),
  });
}

export async function logout(_req, res) {
  res.json({
    message: "Logged out successfully.",
  });
}

export async function getProfile(req, res) {
  const user = await User.findByPk(req.auth.userId);

  if (!user) {
    throw new ApiError(404, "User profile was not found.");
  }

  res.json({
    user: sanitizeUser(user),
  });
}

export async function updateProfile(req, res) {
  const user = await User.findByPk(req.auth.userId);

  if (!user) {
    throw new ApiError(404, "User profile was not found.");
  }

  const { petName, petDetails, ownerPhone, password } = req.body;
  const previousPetName = user.petName;

  if (petName && petName !== user.petName) {
    const existingUser = await User.findOne({
      where: {
        petName,
      },
    });

    if (existingUser && existingUser.id !== user.id) {
      throw new ApiError(409, "Pet name already exists.");
    }

    user.petName = petName;
  }

  if (petDetails !== undefined) {
    user.petDetails = petDetails;
  }

  if (ownerPhone !== undefined) {
    user.ownerPhone = ownerPhone;
  }

  if (password) {
    user.passwordHash = await bcrypt.hash(password, 12);
  }

  await user.save();

  if (previousPetName !== user.petName) {
    await FeedingHistory.update(
      {
        petName: user.petName,
      },
      {
        where: {
          userId: user.id,
        },
      },
    );
  }

  res.json({
    token: generateAuthToken(user),
    user: sanitizeUser(user),
  });
}
