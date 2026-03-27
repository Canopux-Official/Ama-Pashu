from pydantic import BaseModel

class RegistrationJobPayload(BaseModel):
    type: str # "register"
    farmer_id: str
    cow_id: str
    face_image_oci: str
    muzzle_image_oci: str

class SearchRequest(BaseModel):
    user_id: str
    role: str  # "farmer" or "admin"
    face_image_oci: str
    muzzle_image_oci: str