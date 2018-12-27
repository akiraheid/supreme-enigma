# Providing anonymous city driver data

## Problem being solved
Cities use these wire strip things across roads to obtain (what I assume to be) driving habits along certain roads. This data is probably used for planning development of neighboring roads as well as traffic light timings. The issue is that these strips are not constantly deployed; they're only out for maybe a week or two collecting data and then are removed. While some data is better than none, it's probably better to have more data for accuracy on actual traffic trends instead of traffic data that may have been affected by construction/weather/events/time of year.

## Brainstorming

### Module in the vehicle
Ask the registerer of the vehicle at the DMV to add a module to the car that stores GPS data. Several ways to get this data to the city.

#### Wireless transmission
Wirelessly transmit the data to stations along roads throughout the city.

Pros
* Data is available immediately
* Little intervention by people to collect data. Essentially automatic

Cons
* Patching stations as people find exploits for the base system (hardware/firmware) is a lot of manual work and is not likely to be done quickly/at all.
* Monitoring stations or even listening to wireless signals could allow vehicles to be tracked (removing the anonymity aspect of volunteering driving habits). Depends on implementation
* Open to spoofing signals. Depending on implementation
* High maintenance if system fails often

#### Dealerships/auto shops
Have dealerships/auto shops (hereby referred to as "D/AS") participate in retrieving the data from the module.

Pros
* Requires physical access to D/AS to spoof data (increases barrier of tampering) but must still have protections against tampering
* No need to maintain stations throughout the city but must maintain systems used by D/AS to give data to the city (effectively reducing the number of physical modules to maintain)

Cons
* Must maintain module in car
	* Dealership has more work to check if module is working or not and replace module if failing
* I hate people touching devices that have my personal information

### Computer vision
Analyze images of the street to determine number of cars on the road at an interval.

### Scanner
Laser with mirror that moves to check lanes for a distance that isn't the expected distance.

Pros
* System doesn't store reflectance of vehicle to allow identification of vehicle based on reflectance. Value is either "there is/is not a car"

Cons
* Reflectance/diffraction of light from different types of vehicles affects accuracy of readings
