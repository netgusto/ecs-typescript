# ecs-typescript

Port of https://github.com/bytearena/ecs from Golang

```
$ yarn install
$ yarn start
```

## Example

```typescript
import * as ecs from './ecs';

// The components data; always design components as simple containers without logic
// interface is perfect for this (except for getters/setters if useful)
interface IWalkProps {
    Direction: "east"|"west"|"south"|"north";
    Distance: number;
}

interface ITalkProps {
    Message: string;
}


// Initialize the ECS manager
const manager = new ecs.Manager();

// Declare the components
const walk = manager.newComponent<IWalkProps>();
const talk = manager.newComponent<ITalkProps>();

// Create 3 entities, and provide their components

// This one only walks
manager.newEntity().addComponent(walk, { Direction: "east", Distance: 3.14 });

// This one only talks
manager.newEntity().addComponent(talk, { Message: "Wassup?" });

// This one does both
manager.newEntity().
    addComponent(walk, { Direction: "north", Distance: 12.4 }).
    addComponent(talk, { Message: "Fluctuat nec mergitur" });

// Tags are masks that help identify entities that match the required components
const walkers = ecs.buildTag(walk);
const talkers = ecs.buildTag(talk);
const walkertalkers = ecs.buildTag(walkers, talkers);

// Process the walkers
console.log("\n# All the walkers walk :")
for (const result of manager.query(walkers)) {
    const walkAspect = result.get(walk);
    console.log(result.entity.id + " > I'm walking", walkAspect.Distance, "km towards", walkAspect.Direction)
}

// Process the talkers
console.log("\n# All the talkers talk (and be mutated) :");
for (const result of manager.query(talkers)) {
    const talkAspect = result.get(talk);
    console.log(result.entity.id + " > I'm talking and I say \"" + talkAspect.Message + '"');

    // Here we mutate the component for this entity
    talkAspect.Message = talkAspect.Message.toUpperCase() + "!!!!";
}

// Process the talkers/walkers
console.log("\n# All the talkers & walkers do their thing :")
for (const result of manager.query(walkertalkers)) {
    const walkAspect = result.get(walk);
    const talkAspect = result.get(talk);
    console.log(result.entity.id + " > I'm walking", walkAspect.Distance, "km towards", walkAspect.Direction, "while saying \"" + talkAspect.Message + "\"")
}


///////////////////////////////////////////////////////////////////////////
// Demonstrating views
// To increase speed for repetitive queries, you can create cached views
// for entities matching a given tag
///////////////////////////////////////////////////////////////////////////

console.log("\n# Demonstrating views");

const talkersView = manager.createView(talkers);

manager.newEntity().
    addComponent(talk, {
        Message: "Ceci n'est pas une pipe",
    });

console.log("\n# There are 3 talkers in the talkersView at this point:")
for (const result of talkersView.get()) {
    const talkAspect = result.get(talk)
    console.log(result.entity.id + " > says \"" + talkAspect.Message + "\"")
}

manager.disposeEntities(talkers);

console.log("\n# Talkers have been disposed; the view has been updated, and we should not print any message below:")
for(const result of talkersView.get()) {
    const talkAspect = result.get(talk);
    console.log(result.entity.id, "says", talkAspect.Message)
}
```
