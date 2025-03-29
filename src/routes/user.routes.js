import { Router } from "express";

import {upload} from "../middlewarse/multer.middleware.js"
import { changeCurrentUserPassword, getCurrentUser, getUserChannelProfile, getWatchedHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewarse/auth.middleware.js";

const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secure routes

router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentUserPassword)
router.route("/get-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").post(verifyJWT,updateAccountDetails)
router.route("/update-avatar").post(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/update-coverimage").post(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchedHistory)
router.route('/getuserchannelprofile/:username').get(verifyJWT, getUserChannelProfile);
router.route('/history').get(verifyJWT,getWatchedHistory)


export default router