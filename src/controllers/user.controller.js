import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
const generateAccessAndRefreshToken=async (userId)=>{
    try {
        const user=await User.findById(userId)
        if (!user) {
            throw new ApiError(404, 'User not found');
        }
        const accessToken =user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
        return {refreshToken, accessToken}

    } catch (error) {
        console.error('Error generating access and refresh tokens:', error);
        throw new ApiError(500, 'Something went wrong while generating refresh and access tokens');
    }
}
//  Common steps registering user
//  get user details from frontend
//  validation - not empty
//  check if user already exists: 
//  check for mandotary things
//  upload it to cloudinary
//  create user object- create entry in db
//  remove password and refresh token field from response
//  check for user creation
//  return response
const registerUser= asyncHandler( async(req, res)=> {
    const {fullName, email, username, password}=req.body
    if(
        [fullName, email, username, password].some((field)=>field?.trim() === "")
        //you can check field one by one 
    ){
        throw new ApiError(400, "All fields are required")
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ApiError(400, "Invalid email format");
    }

    const existedUser=await User.findOne({
        $or:[{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, 'User with email / Username is already exists')
    }

    const avtarLocalPath =req.files?.avtar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    if(!avtarLocalPath){
        throw new ApiError(400, 'Avatar file is required!!')
    }

    const avtar=await uploadOnCloudinary(avtarLocalPath);
    const coverImage= await uploadOnCloudinary(coverImageLocalPath);
    if(!avtar){
        throw new ApiError(400, 'Avatar file is required!!')
    }

    const user=await User.create({
        fullName:fullName,
        avtar:avtar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: username ? username.toLowerCase() : ""
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
        //here we are exluding password and refreshToken from response after creating User
    )

    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while registering the user')
    } 

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!!")
    )
})
 
const loginUser= asyncHandler(async (req, res)=>{
    // req body-> data
    // username or email
    // find the user
    // password check
    // access and refresh token sent to user(if correct)
    // send access and refresh token through cookies 
    const {email, username, password} =req.body

    if(!(username || email)){
        throw new ApiError(400, 'Username or email is required')
    }

    const user=await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, 'User does not exist')
    }

    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, 'Password is Incorrect')
    }
    const {accessToken, refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options={
        httpOnly: true,
        secure: true
    }
    return res
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{}, "User logged out Successfully "))
})

const refreshAccessToken=asyncHandler(async(req, res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
    
        const user=await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options={
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken}=await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken},
                "Access Token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Inavalid refresh token")
    }

})


export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}