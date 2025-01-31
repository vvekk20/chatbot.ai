import os
import logging
from datetime import datetime, time, timezone, timedelta
from io import BytesIO
import base64
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
# from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
# import torch
import bcrypt
import pyotp
import qrcode
from pymongo import MongoClient
from firebase_admin import auth, credentials, initialize_app
from uuid import uuid4
from dotenv import load_dotenv
from time import sleep
from openai import OpenAI
import tempfile
import requests

# Initialize and configure logger
logging.basicConfig(
    level=logging.INFO,  # Set the desired logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    format="%(asctime)s - %(levelname)s - %(message)s",  # Log format
    handlers=[
        logging.StreamHandler(),  # Output logs to console
        logging.FileHandler("app.log", mode="a")  # Save logs to a file named 'app.log'
    ]
)

logger = logging.getLogger(__name__)

# Example logging messages
logger.info("Logger has been configured successfully.")
logger.debug("Debugging mode is enabled.")

# Initialize Flask app
app = Flask(__name__)


# Allow dynamic origin based on request header
CORS(app, supports_credentials=True)
CORS(app)

# Load environment variables from .env file
load_dotenv()

# Firebase Configuration from .env
FIREBASE_CRED = {
    "type": os.getenv("GOOGLE_SERVICE_ACCOUNT_TYPE"),
    "project_id": os.getenv("GOOGLE_SERVICE_ACCOUNT_PROJECT_ID"),
    "private_key_id": os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID"),
    "private_key": os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY").replace("\n", "\n"),  # Correctly format the private key
    "client_email": os.getenv("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL"),
    "client_id": os.getenv("GOOGLE_SERVICE_ACCOUNT_CLIENT_ID"),
    "auth_uri": os.getenv("GOOGLE_SERVICE_ACCOUNT_AUTH_URI"),
    "token_uri": os.getenv("GOOGLE_SERVICE_ACCOUNT_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL"),
    "client_x509_cert_url": os.getenv("GOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL")
}
# Initialize Firebase Admin SDK
def initialize_firebase():
    """
    Initializes the Firebase Admin SDK if not already initialized.
    """
    logging.info("Initializing Firebase Admin SDK...")
    # Check if Firebase is already initialized
    if not hasattr(app, 'firebase_initialized'):  # Check if attribute is set
        try:
            cred = credentials.Certificate(FIREBASE_CRED)
            initialize_app(cred)
            app.firebase_initialized = True
            logging.info("Firebase Admin SDK initialized successfully")
        except Exception as e:
            logging.error(f"Error initializing Firebase: {e}")
            raise
    else:
        logging.info("Firebase Admin SDK already initialized")

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = [
        "http://localhost:3000",
        "http://srpski.ai",
        "http://18.184.11.180"
    ]
    
    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Guest-Login"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
    # Avoid setting COOP for OAuth routes
    if request.path.startswith('/api/auth/google-login'):
        response.headers.pop("Cross-Origin-Opener-Policy", None)
    
    return response



# Load the environment variables from .env file
load_dotenv()

# Get the path to the JSON file from the environment variable
json_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
# Check if the JSON file exists in the given path or with 'src/' prefix
src_path = f"src/{json_path}"  # Add 'src/' prefix dynamically

# Get the Gemini API key from the environment variable
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")

client_OpenAI = OpenAI()

# Check if the GEMINI_API_KEY is available
if GEMINI_API_KEY:
    # Initialize Gemini SDK
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini SDK initialized successfully.")
else:
    print("Error: GEMINI_API_KEY is not set in the environment.")

# Check if the file exists
if os.path.exists(json_path) or os.path.exists(src_path):
    # Set the environment variable for Google Cloud SDK
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = json_path
    print(f"GOOGLE_APPLICATION_CREDENTIALS set to {json_path}")

    from google.cloud import translate_v2 as translate    

    # Initialize the Google Cloud Translate client
    translate_client = translate.Client()
else:
    print(f"Error: The file '{json_path}' does not exist.")

# Not Using Fronted to Fetch Language Preference , uses Detect Language by Google . 

def translate_text(text: str, target_language: str) -> dict:
    """
    Translates the given text to the target language using the Google Cloud Translate Python client.
    Args:
        text (str): Input text in any language.
        target_language (str): Target language in ISO 639-1 code (e.g., 'en' for English, 'es' for Spanish).
    Returns:
        dict: A dictionary containing the translated text and detected source language.
    """
    try:
        # Text can also be a sequence of strings, in which case this method will return a sequence of results for each text.
        result = translate_client.translate(text, target_language=target_language)
        
        translated_text = result["translatedText"]
        detected_language = result.get("detectedSourceLanguage", None)

        logger.info("Original text: %s", text)
        logger.info("Detected language: %s", detected_language)
        logger.info("Translated text: %s", translated_text)

        return {
            "translated_text": translated_text,
            "detected_language": detected_language
        }
    except Exception as e:
        # Handle Google Cloud Translate specific error for invalid language pair
        if "Bad language pair" in str(e):
            logger.error(f"Invalid language pair error: {e}")
            logger.info("Fallback to English translation due to invalid language pair.")
            # Default to translating to English
            result = translate_client.translate(text, target_language="en")
            translated_text = result["translatedText"]
            detected_language = result.get("detectedSourceLanguage", None)

            return {
                "translated_text": translated_text,
                "detected_language": detected_language
            }
        
        logger.error(f"Error in translate_text: {e}")
        raise ValueError("Failed to translate text.")

def auto_to_english(text: str) -> dict:
    """
    Translates the given text to English and detects the original language in a single API call using the Python client.
    Args:
        text (str): Input text in any language.
    Returns:
        dict: A dictionary containing translated text in English and the detected language (ISO 639-1 code).
    """
    result = translate_text(text, "en")
    return {
        "translated_text": result["translated_text"],
        "detected_language": result["detected_language"]
    }

def english_to_detected_language(text: str, detected_language: str) -> str:
    """
    Translates the given text from English to the specified detected language using the Python client.
    Args:
        text (str): Input text in English.
        detected_language (str): Detected language in ISO 639-1 code (e.g., 'es' for Spanish, 'fr' for French).
    Returns:
        str: Translated text in the detected language.
    """
    result = translate_text(text, detected_language)
    return result["translated_text"]



# Define the model names
GEMINI_MODEL_NAME = "gemini-1.5-flash"

# # Configure Bits and Bytes for 4-bit quantization
# bnb_config = BitsAndBytesConfig(
#     load_in_4bit=True,
#     bnb_4bit_quant_type="nf4",
#     bnb_4bit_use_double_quant=False,  # Fixed to use the correct boolean value
# )

# # Load Yugo GPT model with quantization
# yugo_tokenizer = AutoTokenizer.from_pretrained("gordicaleksa/YugoGPT",device_map="cuda")
# yugo_model = AutoModelForCausalLM.from_pretrained(
#     "gordicaleksa/YugoGPT",
#     quantization_config=bnb_config,
#     device_map="cuda",
# )

# # Load Phi3 model for summarization with quantization
# phi3_tokenizer = AutoTokenizer.from_pretrained("microsoft/Phi-3-mini-4k-instruct", trust_remote_code=True,device_map="cuda")
# phi3_model = AutoModelForCausalLM.from_pretrained(
#     "microsoft/Phi-3-mini-4k-instruct",
#     quantization_config=bnb_config,
#     device_map="cuda",
#     trust_remote_code=True
# )

@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = request.headers.get('Origin', "http://localhost:3000")
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Guest-Login"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.route("/api/health-check", methods=["GET"])
def health_check():
    return "OK", 200

@app.route("/api/upload-image", methods=["POST"])
@jwt_required(optional=True)
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    # Get the uploaded image file
    image = request.files["image"]

    # Create a temporary file to store the image
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
        temp_file_path = temp_file.name
        image.save(temp_file_path)

    try:
        # Convert the image to base64 and prepare it for upload
        with open(temp_file_path, "rb") as img_file:
            files = {"image": img_file}

            # Upload the image to ImgBB
            response = requests.post(
                f"https://api.imgbb.com/1/upload?key={IMGBB_API_KEY}",
                files=files,
            )
            response_data = response.json()

        # Check if the upload was successful
        if response.status_code == 200 and response_data.get("success"):
            image_url = response_data["data"]["url"]
            return jsonify({"imageUrl": image_url}), 200
        else:
            error_message = response_data.get("error", {}).get("message", "Unknown error")
            return jsonify({"error": f"Image upload failed: {error_message}"}), 500
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500
    finally:
        # Delete the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.route("/api/process-image", methods=["POST"])
@jwt_required(optional=True)
def process_image():
    data = request.get_json()
    base64_image = data.get("base64Image")

    if not base64_image:
        return jsonify({"error": "No image data provided"}), 400
    
    # Function to encode the image to Base64
    def encode_image(base64_image):
        return base64_image.split(",")[1]  # Get the raw Base64 string (strip the data URL prefix)

    

    try:

        # Prepare the image data by encoding it correctly
        base64_image_content = encode_image(base64_image)

        # Send the image URL to GPT Vision for text extraction
        vision_response = client_OpenAI.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Please extract the text from the image. If the text is not in English, provide the translation along with the original text.If it is English then Don't mention about translation .Use format Orignal: /n Translated(only if not English): "
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image_content}"  # Pass the image data URL
                            }
                        },
                    ],
                }
            ],
            max_tokens=500,
        )


        # Extract the result from GPT Vision response
        extracted_text = vision_response.choices[0].message.content


        return jsonify({"extractedText": extracted_text}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Initialize chat history for the sessions
history_init_sys_prompt = [
    {"role": "developer", "content": "You are called 'Srpski Ai' an English and Serbian Assistant, don't reveal you are Chat GPT "}
]

def stream_response(stream):
    # Stream each chunk as it arrives from the OpenAI API
    for chunk in stream:
        content = chunk.choices[0].delta.content or ""
        yield content  # Yield each chunk of content immediately as it arrives
        sleep(0.1)
    
 


@app.route('/api/start-chat', methods=['POST'])
@jwt_required(optional=True)
def start_chat():
    is_guest = is_guest_user()

   # Step 1: Handle guest users
    if is_guest:
        current_user = "guest"
        logger.info("Guest login detected.")
    else:
        # Step 2: Handle authenticated users
        current_user = get_jwt_identity()
        if not current_user:
            logger.error("No valid token provided or token decoding failed.")
            return jsonify({"msg": "Authentication required."}), 401

    # Step 3: Skip MongoDB interaction for guest users
    if current_user != "guest":
        # Normalize username and fetch user
        current_user = current_user.lower().strip()
        user = users.find_one({"username": current_user})
        logger.debug(f"Query result for user {current_user}: {user}")

        if not user:
            logger.error(f"User not found in MongoDB for username: {current_user}")
            return jsonify({"msg": "User not found."}), 404
        
    if not request.is_json:
        logger.warning("Request must be JSON.")
        return jsonify({"error": "Request must be JSON."}), 400

    data = request.get_json()
    user_message = data.get('message')

    if not user_message or not isinstance(user_message, str):
        logger.warning("Invalid input: 'message' must be a non-empty string.")
        return jsonify({"error": "'message' must be a non-empty string."}), 400
    


    # Step 4: Dynamically add the user message to the existing history
    updated_history = history_init_sys_prompt + [
        {"role": "user", "content": user_message}
    ]

    try:
        # # Translate user input to English and get detected language from the response
        # response = auto_to_english(user_message)  # This now returns the full response with both translated text and detected language
        # translated_user_message = response["translated_text"]
        # detected_language = response["detected_language"]

        # # Generate response using Gemini
        # gemini_model = genai.GenerativeModel(
        #     model_name=GEMINI_MODEL_NAME,
        #     system_instruction="You are a helpful and concise assistant called Srpski AI . Provide direct, specific, and clear responses.Encourage follow-up questions to ensure clarity and provide reasoning when applicable to enhance understanding."
        # )
        # gemini_chat = gemini_model.start_chat(history=history)
        # gemini_response = gemini_chat.send_message(translated_user_message)
        # gemini_text = gemini_response.text.strip() if hasattr(gemini_response, 'text') else str(gemini_response).strip()

        # # Translate the Gemini response back to the user's detected language
        # translated_response = english_to_detected_language(gemini_text, detected_language)

        # summarized_text = translated_response


        logger.info(updated_history)

        # Pass the updated history to the GPT completion request
        stream = client_OpenAI.chat.completions.create(
            model="gpt-4o-mini",
            messages=updated_history,
            stream=True,
            max_tokens=500,
        )

        #logger.info(completion.choices[0].message)

        # Initialize the summarized response
        summarized_text = ""

                
        # # Generate response using Yugo GPT
        # yugo_input = yugo_tokenizer(user_message, return_tensors="pt").to('cuda')
        # yugo_output = yugo_model.generate(**yugo_input, max_new_tokens=200,)
        # yugo_text = yugo_tokenizer.decode(yugo_output[0], skip_special_tokens=True)

        # # Summarize using Phi3
        # combined_response = f"Gemini response: {gemini_text}\nYugo GPT response: {yugo_text}"
        # phi3_input = phi3_tokenizer(combined_response, return_tensors="pt").to('cuda')
        # phi3_output = phi3_model.generate(**phi3_input, max_new_tokens=200)
        # summarized_text = phi3_tokenizer.decode(phi3_output[0], skip_special_tokens=True)

        # Log the responses
        # logger.info("Gemini Response: %s", gemini_text)
        # logger.info("Yugo GPT Response: %s", yugo_text)
        # logger.info("Summarized Response: %s", summarized_text)
        # logger.info("Final Translated Response (to Detected Language): %s", translated_response)

         # Store the message in the database
        if current_user != "guest":
            session_id = str(uuid4())


        # Process each chunk from the stream and simultaneously save it in real time
        def store_and_stream():
            nonlocal summarized_text
            for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                summarized_text += content  # Append the content to the full response
                yield content  # Yield the content to simulate streaming
                
                
            # Save the response after accumulating enough text
            if current_user != "guest":
                store_chat_message(current_user, session_id, user_message, summarized_text)
        

        # Return the summarized response (as plain text for now)
        return Response(store_and_stream(), content_type="text/plain")

    except Exception as e:
        logger.error(f"Error during start_chat: {e}")
        return "An internal error occurred.", 500  # Return plain text error

@app.route('/api/continue-chat', methods=['POST'])
@jwt_required(optional=True) 
def continue_chat():
    if not request.is_json:
        logger.warning("Request must be JSON.")
        return jsonify({"error": "Request must be JSON."}), 400
    
    # Handle guest users
    is_guest = is_guest_user()
    if is_guest:
        current_user = "guest"
        logger.info("Guest login detected.")
    else:
        # Handle authenticated users
        current_user = get_jwt_identity()
        if not current_user:
            return jsonify({"msg": "Authentication required."}), 401
        current_user = current_user.lower().strip()
        
    data = request.get_json()
    messages = data.get('messages')


    # # Format messages to adhere to the Gemini SDK's expected structure
    # formatted_messages = [
    #     {"role": msg["role"], "parts": [msg["content"]]} for msg in messages
    # ]

    # Extract the latest user message (last entry in the messages list)
    latest_user_message = messages[-1]["content"] if messages[-1]["role"] == "user" else None

    if not latest_user_message:
        logger.warning("The last message must be from the user.")
        return jsonify({"error": "The last message must be from the user."}), 400

    try:

        # # Translate the latest user message to English and get detected language from the response
        # response = auto_to_english(latest_user_message)  # This now returns the full response with both translated text and detected language
        # translated_latest_message = response["translated_text"]
        # detected_language = response["detected_language"]

        # # Generate response using Gemini
        # gemini_model = genai.GenerativeModel(model_name=GEMINI_MODEL_NAME)
        # gemini_chat = gemini_model.start_chat(history=formatted_messages)
        # gemini_response = gemini_chat.send_message(translated_latest_message)
        # gemini_text = gemini_response.text.strip() if hasattr(gemini_response, 'text') else str(gemini_response).strip()

        # # Translate the Gemini response back to the user's detected language
        # translated_response = english_to_detected_language(gemini_text, detected_language)

        # summarized_text = translated_response



        # Limit history to the last 3 interactions (6 messages total)
        last_interactions = messages[-6:] if len(messages) > 6 else messages
        updated_history = history_init_sys_prompt + last_interactions

        logger.info(updated_history)

        # Generate response
        stream = client_OpenAI.chat.completions.create(
            model="gpt-4o-mini",
            messages=updated_history,
            stream=True,
            max_tokens=500,
        )

        # Initialize the summarized response
        summarized_text = ""     

        # # Generate response using Yugo GPT
        # yugo_input = yugo_tokenizer(latest_user_message, return_tensors="pt").to('cuda')
        # yugo_output = yugo_model.generate(**yugo_input, max_new_tokens=200)
        # yugo_text = yugo_tokenizer.decode(yugo_output[0], skip_special_tokens=True)

        # # Summarize using Phi3
        # combined_response = f"Gemini response: {gemini_text}\nYugo GPT response: {yugo_text}"
        # phi3_input = phi3_tokenizer(combined_response, return_tensors="pt").to('cuda')
        # phi3_output = phi3_model.generate(**phi3_input, max_new_tokens=200)
        # summarized_text = phi3_tokenizer.decode(phi3_output[0], skip_special_tokens=True)

        # Log the responses
        # logger.info("Gemini Response: %s", gemini_text)
        # logger.info("Yugo GPT Response: %s", yugo_text)
        # logger.info("Summarized Response: %s", summarized_text)
        # logger.info("Final Translated Response (to Detected Language): %s", translated_response)

    
        # Process each chunk from the stream and simultaneously save it in real time
        def store_and_stream():
            nonlocal summarized_text
            for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                summarized_text += content  # Append the content to the full response
                yield content  # Yield the content to simulate streaming
                
                
            # Save the response after accumulating enough text
            if current_user != "guest":
                session_id = data.get('session_id')
                if not session_id or not messages:
                    return jsonify({"error": "'session_id' and 'messages' are required."}), 400
                new_message = {
                "role": "assistant",
                "content": summarized_text
            }
                messages.append(new_message)
                store_chat_message(current_user, session_id, latest_user_message, summarized_text)
        

        # Return the summarized response (as plain text for now)
        return Response(store_and_stream(), content_type="text/plain")

    except Exception as e:
        logger.error(f"Error during continue_chat: {e}")
        return "An internal error occurred.", 500  # Return plain text error

# MongoDB setup
json_path = os.getenv("MONGO_URI")
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI is not set in the .env file.")
client = MongoClient(MONGO_URI, maxPoolSize=50, connectTimeoutMS=30000)
db = client["Konma"]
users = db["users"]
chat_history = db["chat_history"]

# JWT setup
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")
logger.debug(f"JWT_SECRET_KEY is set to: {app.config['JWT_SECRET_KEY']}")
 # Token expires in 1 hour
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(
    hours=int(os.getenv("JWT_EXPIRY_HOURS", 1))
)

jwt = JWTManager(app)

# Endpoint: Signup with TOTP
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username').lower().strip()  # Normalize username
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({"msg": "All fields (username, email, password) are required"}), 400

    if users.find_one({"email": email}):
        return jsonify({"msg": "User already exists"}), 400
    
    if users.find_one({"username": username}):  # Check by normalized username
        return jsonify({"msg": "User with this username already exists"}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    totp_secret = pyotp.random_base32()

    users.insert_one({
        "username": username,  # Save username in MongoDB
        "email": email,
        "password": hashed_password,
        "two_factor_secret": totp_secret
    })

    access_token = create_access_token(identity=username)  # Generate token
    logger.info(f"Generated JWT Token for signup: {access_token}")
    
    totp = pyotp.TOTP(totp_secret)
    uri = totp.provisioning_uri(email, issuer_name="YourApp")
    img = qrcode.make(uri)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    qrcode_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

    # Log the secret and URI for debugging
    logging.debug(f"TOTP Secret for {username}: {totp_secret}")
    logging.debug(f"TOTP URI for {email}: {uri}")

    return jsonify({"msg": "Signup successful", "qrcode": qrcode_base64, "token": access_token}), 201

# Endpoint: Login with TOTP
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username').lower().strip()
    password = data.get('password')
    token = data.get('token')  # TOTP token for manual login

    if not username or not password:
        logger.error("Username or password missing in login request")
        return jsonify({"msg": "Username and password are required"}), 400
    
    # Fetch user from MongoDB
    user = users.find_one({"username": username})
    logger.debug(f"MongoDB query result for username {username}: {user}")
    
    if not user:
        logger.error(f"User not found with username: {username}")
        return jsonify({"msg": "User does not exist"}), 404

    logger.info(f"User found: {user}")

    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        logger.error("Password mismatch for user")
        return jsonify({"msg": "Invalid credentials"}), 400

    # Validate TOTP for manual login
    totp = pyotp.TOTP(user['two_factor_secret'])
    logging.debug(f"TOTP Secret for {username}: {user['two_factor_secret']}")
    logging.debug(f"Expected TOTP: {totp.now()}")
    logging.debug(f"User's TOTP input: {token}")

    if not totp.verify(token, valid_window=1):  # Allow a small clock drift
        logging.error("Invalid TOTP code")
        return jsonify({"msg": "Invalid TOTP code"}), 400

    access_token = create_access_token(identity=username)
    logger.info("Login successful")
    return jsonify({"token": access_token}), 200


# Endpoint: Check Authentication
@app.route('/api/auth/check-auth', methods=['GET'])
@jwt_required(optional=True)
def check_auth():
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"authenticated": False}), 200

    # Fetch user details from the database
    user = users.find_one({"username": current_user})
    if not user:
        return jsonify({"authenticated": False}), 200

    return jsonify({
        "authenticated": True,
        "user": {
            "username": user.get("username", "Guest User"),
            "email": user.get("email", "guestuser@gmail.com"),
        }
    }), 200


# Error response function
def create_error_response(message, status_code):
    """
    Create a structured error response.
    """
    logging.error(f"Error: {message} - Status Code: {status_code}")
    return jsonify({"error": message}), status_code

@app.route('/api/auth/google-login', methods=['POST'])
def google_login():
    """Endpoint for Google Login using Firebase ID token."""
    try:
        # Parse incoming JSON data
        data = request.json
        logging.debug(f"Received data: {data}")
        firebase_token = data.get("token")  # Firebase ID token
        username = data.get("username")
        email = data.get("email")

        # Validate required fields
        if not firebase_token:
            logging.warning("Firebase token is missing.")
            return create_error_response("Firebase token is required", 400)

        if not username or not email:
            logging.warning(f"Missing username or email. Username: {username}, Email: {email}")
            return create_error_response("Username and email are required", 400)

         # Normalize username
        username = (username or f"google_{email.split('@')[0]}").lower().strip()

        # Initialize Firebase Admin SDK if not already initialized
        logging.info("Verifying Firebase ID token...")
        initialize_firebase()

        # Verifying Firebase ID token
        try:
            logging.info("Verifying Firebase ID token...")
            decoded_token = auth.verify_id_token(firebase_token)
            logging.debug(f"Decoded Firebase token: {decoded_token}")

            if not decoded_token:
                logging.warning("Firebase token is invalid or expired.")
                return create_error_response("Invalid Firebase ID token", 401)

            # If verification is successful
            logging.info(f"Token successfully verified for user: {decoded_token['uid']}")

                # Check if the user exists in MongoDB
            user = users.find_one({"email": email})
            if not user:
                users.insert_one({
                    "username": username or f"google_{email.split('@')[0]}",
                    "email": email,
                    "created_at": datetime.now(),
                    "chats": []
                })
                
        except auth.InvalidIdTokenError as e:
            logging.error(f"Firebase token verification failed: {e}")
            return create_error_response("Invalid or expired Firebase ID token", 401)

        # Log token verification success
        logging.info(f"Token successfully verified for user: {username} with email: {email}")

        # Generate JWT token for session management
        access_token = create_access_token(identity={"username": username, "email": email})
        logging.info(f"JWT token generated for user: {username}")

        # Return success message with success field
        return jsonify({
            "success": True,
            "message": "Google login successful",
            "token": access_token
        }), 200

    except auth.InvalidIdTokenError:
        logging.error("Invalid or expired Firebase ID token encountered.")
        return create_error_response("Invalid or expired Firebase ID token", 401)

    except Exception as e:
        logging.error(f"Unhandled error occurred during Google login: {e}", exc_info=True)
        return create_error_response("An unexpected error occurred", 500)
    
@app.route('/api/chat-history', methods=['GET'])
@jwt_required(optional=True)
def get_chat_history():
    current_user = get_jwt_identity()
    if not current_user:
        logger.error("JWT decoding failed or no token provided.")
        return jsonify({"msg": "Authentication required."}), 401

    logger.info(f"User authenticated successfully: {current_user}")

    # Normalize username
    if isinstance(current_user, dict):
        username = (current_user.get("username") or f"google_{current_user.get('email').split('@')[0]}").lower().strip()
    else:
        username = current_user.lower().strip()

    if not username:
        logger.error("Failed to extract username from current_user.")
        return jsonify({"msg": "Failed to determine user identity."}), 400

    logger.info(f"Querying chat history for username: {username}")

    # Fetch user and chat history
    user = users.find_one({"username": username})
    if not user:
        logger.error(f"User not found in MongoDB for username: {username}")
        return jsonify({"msg": "User not found."}), 404

    chats = list(chat_history.find(
        {"username": username},
        {"_id": 0, "session_id": 1, "messages": {"$slice": -1}, "last_updated": 1}
    ))

    sorted_chats = sorted(chats, key=lambda chat: chat["last_updated"], reverse=True)
    return jsonify({"history": sorted_chats}), 200


def store_chat_message(username, session_id, user_message, summarized_text):
    if username == "guest":
        logger.info("Guest user: Skipping chat message storage.")
        return
    
     # Normalize username
    if isinstance(username, dict):
        username = (username.get("username") or f"google_{username.get('email').split('@')[0]}").lower().strip()

    """Stores the chat message in the database."""
    timestamp = datetime.now(timezone.utc).isoformat()  # Use ISO format with timezone
    chat_entry = {
        "user_message": user_message,
        "response": summarized_text,
        "timestamp": timestamp,
    }

    # Check if the session already exists for the user
    existing_session = chat_history.find_one({"username": username, "session_id": session_id})
    if existing_session:
        # Append the new message to the existing session
        chat_history.update_one(
            {"username": username, "session_id": session_id},
            {"$push": {"messages": chat_entry}, "$set": {"last_updated": timestamp}}
        )
    else:
        # Create a new chat session if none exists
        chat_history.insert_one({
            "username": username,
            "session_id": session_id,
            "messages": [chat_entry],
            "last_updated": timestamp,
        })
    logger.info(f"Chat message stored successfully for user: {username}, session: {session_id}")

@app.route('/api/chat-history/<session_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_chat_session(session_id):
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "Authentication required."}), 401

    current_user = current_user.lower().strip()  # Normalize username
    result = chat_history.delete_one({"username": current_user, "session_id": session_id})

    if result.deleted_count == 0:
        logger.warning(f"Session ID {session_id} not found for user: {current_user}")
        return jsonify({"msg": "Session not found or already deleted."}), 404

    logger.info(f"Chat session {session_id} deleted for user: {current_user}")
    return jsonify({"msg": "Chat session deleted successfully."}), 200

@app.route('/api/chat-history', methods=['DELETE'])
@jwt_required(optional=True)
def delete_all_chat_history():
    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "Authentication required."}), 401

    current_user = current_user.lower().strip()  # Normalize username
    result = chat_history.delete_many({"username": current_user})

    logger.info(f"All chat history deleted for user: {current_user}")
    return jsonify({"msg": "All chat history cleared."}), 200

@app.route('/api/chat-session/<session_id>', methods=['GET'])
@jwt_required(optional=True)  # Allow guest access
def get_chat_session(session_id):
    is_guest = is_guest_user()
    if is_guest:
        logger.info("Guest user: Chat sessions are not stored for guests.")
        return jsonify({"messages": []}), 200  # Return empty messages for guests

    current_user = get_jwt_identity()
    if not current_user:
        return jsonify({"msg": "Authentication required."}), 401

    current_user = current_user.lower().strip()  # Normalize username
    session = chat_history.find_one(
        {"username": current_user, "session_id": session_id},
        {"_id": 0, "messages": 1}
    )

     # Include user input and assistant responses in the message payload
    formatted_messages = []
    for message in session["messages"]:
        formatted_messages.append({
            "role": "user",
            "content": message.get("user_message", "")
        })
        if message.get("response"):
            formatted_messages.append({
                "role": "assistant",
                "content": message["response"]
            })

    return jsonify({"messages": formatted_messages}), 200

def is_guest_user():
    return request.headers.get("Guest-Login", "false").lower() == "true"

if __name__ == '__main__':
    app.run(port=5000,debug=True)  # Run without debug mode

