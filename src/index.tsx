import * as ecs from './ecs';

// // The Walk component; always design components as simple containers
// // without logic (except for getters/setters if useful)
// type Walk struct {
// 	Direction string
// 	Distance  float64
// }

// // The Walk component
// type Talk struct {
// 	Message string
// }

// Initialize the ECS manager
const manager = new ecs.Manager();

// Declare the components
const walk = manager.newComponent();
const talk = manager.newComponent();

// Create 3 entities, and provide their components
// Component data may be anything (interface{})
// Use pointers if you want to be able to mutate the data
manager.newEntity().
    addComponent(walk, {
        Direction: "east",
        Distance:  3.14,
    })

manager.newEntity().
    addComponent(talk, {
        Message: "Wassup?",
    })

manager.newEntity().
    addComponent(walk, {
        Direction: "north",
        Distance:  12.4,
    }).
    addComponent(talk, {
        Message: "Fluctuat nec mergitur.",
    })

// Tags are masks that help identify entities that match the required components
const walkers = ecs.buildTag(walk)
const talkers = ecs.buildTag(talk)
const walkertalkers = ecs.buildTag(walkers, talkers)

// Process the walkers
console.log("\n# All the walkers walk :")
for (const result of manager.query(walkers).results()) {
    const walkAspect = result.components.get(walk);
    console.log("I'm walking", walkAspect.Distance, "km towards", walkAspect.Direction)
}

// Process the talkers
console.log("\n# All the talkers talk (and be mutated) :");
for (const result of manager.query(talkers).results()) {
    const talkAspect = result.components.get(talk);
    console.log(talkAspect.Message, "Just sayin'.");

    // Here we mutate the component for this entity
    talkAspect.Message = "So I was like 'For real?' and he was like '" + talkAspect.Message + "'";
}

// Process the talkers/walkers
console.log("\n# All the talkers & walkers do their thing :")
for (const result of manager.query(walkertalkers).results()) {
    const walkAspect = result.components.get(walk);
    const talkAspect = result.components.get(talk);
    console.log("I'm walking towards", walkAspect.Direction, ";", talkAspect.Message)
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

console.log("\n# Should print 3 messages :")
for (const result of talkersView.get().results()) {
    const talkAspect = result.components.get(talk)
    console.log(result.entity.id + " says " + talkAspect.Message)
}

manager.disposeEntities(...manager.query(talkers).entities())

console.log("\n# Talkers have been disposed; should not print any message below :")
for(const result of talkersView.get().results()) {
    const talkAspect = result.components.get(talk);
    console.log(result.entity.id, "says", talkAspect.Message)
}
