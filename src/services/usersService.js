import { api } from "./api";

export async function uploadUserLocation({ longitude, latitude }){
  const result = api.post('/api/users/location', {
    longitude: longitude, 
    latitude: latitude
  });
  return result.data;
}

