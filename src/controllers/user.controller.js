import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const genrateAccessAndRefreshTokenToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      400,
      "Somthing went wrong while genrating the acess or refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get users deatils from the frontend
  //validation
  //check if user already exists
  //chech for image and avtar
  //upload them to the cloudinory
  //create the user object -create enry in db
  //remove the password and refresh token field
  //check for the user creation
  // return response

  const { username, email, fullName, password } = req.body;

  if (
    [username, email, fullName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields is requried");
  }
  //   if(fullName === ""){
  //     throw new ApiError(400,"fullName is requried")
  //   }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username or email Already existed");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  console.log("Cover Image Path:", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar field required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar field is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(400, "something went wrong when registering new user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, "user created successfully", createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  //get data from he request body
  //username 0r email access
  //find the user
  //chech the password is correct or not
  //if correct then genrate he access and refresh token
  //store the refresh token in the database
  //end the access token to the user browser using the cookies
  // send the response to the users

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "username or email required");
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });

  if (!user) {
    throw new ApiError(400, "user does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "password is incorrect");
  }

  const { accessToken, refreshToken } = await genrateAccessAndRefreshTokenToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200, "User Logged In SuccessFully", {
        user: loggedInUser,
        accessToken,
        refreshToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged Out", {}));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookes.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorizzed Request");
  }

  try {
    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedRefreshToken._id);

    if (!user) {
      throw new ApiError(401, "Invaliid refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is Expired or used");
    }

    const { accessToken, newRefreshToken } =
      await genrateAccessAndRefreshTokenToken(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(200, "Access Token Refresh SuccessFully", {
          accessToken,
          refreshToken: newRefreshToken,
        })
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new passwords are required");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password Changed Successfully", {}));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, "Curremt User Fetch SuccessFully", req.user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(401, "all fields required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-passsword");

  return res
    .status(200)
    .json(new ApiResponse(200, "Account Details Updated Successfully", user));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!req.user?._id) {
    throw new ApiError(401, "user not found");
  }

  if (!avatarLocalPath) {
    throw new ApiError(401, "Avtar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(401, "Error while uploding avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Avatar Updated Sucessfully", user));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!req.user?._id) {
    throw new ApiError(401, "user not found");
  }

  if (!coverImageLocalPath) {
    throw new ApiError(401, "Cover Image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(401, "Error while uploding Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cover Image Updated Sucessfully", user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(401, "Username is missing");
  }

  //  User.find({username})
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subcribersCount: {
          $size: "$subscribers",
        },
        channelSubcribedToCount: {
          $size: "$subscribedTo",
        },
        isSubcribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        channelSubcribedToCount: 1,
        isSubcribed: 1,
        subcribersCount: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(401, "channel does not exist");
  }

  console.log(channel);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "User channel fetched successfully", channel[0])
    );
});

const getWatchedHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Watch history fetched successfully",
        user[0].watchHistory
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentUserPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchedHistory,
};
