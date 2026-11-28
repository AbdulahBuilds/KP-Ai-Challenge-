export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

export function isLocationSecureContext(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
  );
}

export function locationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === 1) {
    return isLocationSecureContext()
      ? 'Location permission was denied. Allow location access in your browser, then try again.'
      : 'Location permission was denied. Location access needs HTTPS (or localhost), then try again.';
  }
  if (error.code === 2) return 'Location information is unavailable. Try again.';
  if (error.code === 3) return 'Location request timed out. Try again.';
  return 'Unable to retrieve location. Check device location services and try again.';
}

export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function getCurrentLocation(): Promise<CapturedLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser. Use a Chrome/Edge browser on HTTPS or localhost.'));
      return;
    }

    const attempt = (highAccuracy: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          if (!isValidCoordinate(latitude, longitude)) {
            reject(new Error('The browser returned invalid coordinates. Try again.'));
            return;
          }
          resolve({
            latitude,
            longitude,
            accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          });
        },
        (error) => {
          if (error.code !== 1 && highAccuracy) {
            attempt(false);
            return;
          }
          reject(new Error(locationErrorMessage(error)));
        },
        highAccuracy
          ? { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
          : { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
      );
    };

    attempt(true);
  });
}
