import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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

    const existedUser=User.findOne({
        $or:[{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, 'User with email / Username is already exists')
    }

    const avtarLocalPath =req.files?.avtar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avtarLocalPath){
        throw new ApiError(400, 'Avatar file is required!!')
    }

    const avtar=await uploadOnCloudinary(avtarLocalPath);
    const coverImage= await uploadOnCloudinary(coverImageLocalPath);
    if(!avtar){
        throw new ApiError(400, 'Avatar file is required!!')
    }

    const user=await User.create({
        fullName,
        avtar:avtar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),

    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
        //here we are exluding password and refreshToken from created User
    )

    if(!createdUser){
        throw new ApiError(500, 'Something went wrong while registering the user')
    } 

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully!!")
    )
})

export {registerUser}