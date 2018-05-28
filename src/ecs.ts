export type EntityID = number;
export type ComponentID = number;

export class Tag {
    private mFlags: number;
    private mInverse: boolean;

    public constructor(flags: number = 0, inverse: boolean = false) {
        this.mFlags = flags;
        this.mInverse = inverse;
    }
    
    public matches(smallertag: Tag): boolean {
        const res = (this.mFlags & smallertag.mFlags) === smallertag.mFlags;
        return smallertag.mInverse ? !res : res;
    }

    public binaryORInPlace(othertag: Tag): Tag {
        this.mFlags |= othertag.mFlags;
        return this;
    }

    public binaryNOTInPlace(othertag: Tag): Tag {
        this.mFlags ^= othertag.mFlags;
        return this;
    }

    public clone(): Tag {
        return new Tag(this.mFlags, this.mInverse);
    }
    
    public inverse(inverse: boolean = true): Tag {
        const clone = this.clone()
        clone.mInverse = inverse
        return clone
    }
}

export class Component {

	private id: ComponentID;
	private tag: Tag;
	private data: Map<EntityID, any>;
    private destructor?: (entity: Entity, data: any) => void;

    public constructor(id: ComponentID) {
        const tag = new Tag(
            (1 << id), // set bit on position corresponding to component number
            false,
        );

        this.id = id;
        this.tag = tag;
        this.data = new Map();
    }

    public getID(): ComponentID {
        return this.id
    }

    public getTag() : Tag {
        return this.tag;
    }

    public getData(id: EntityID): undefined | any {
        return this.data.get(id);
    }

    public hasData(id: EntityID): boolean {
        return this.data.has(id);
    }

    public setData(id: EntityID, data: any): Component {
        this.data.set(id, data);
        return this;
    }
    
    public setDestructor(destructor: (entity: Entity, data: any) => void) {
        this.destructor = destructor
    }

    public destroyEntity(entity: Entity) : Component {
        const id = entity.getId();

        if (this.destructor) {
            if (this.data.has(id)) {
                this.destructor(entity, this.data.get(id));
            }
        }

        this.data.delete(id);

        return this;
    }

    public getDestructor() : undefined | ((entity: Entity, data: any) => void) {
        return this.destructor;
    }
}

export class Entity {

	public id: EntityID;
	private tag: Tag;
    private manager: Manager;

    public constructor(id: EntityID, manager: Manager) {
        this.id = id;
        this.manager = manager;
        this.tag = new Tag();
    }
    
    public getId(): EntityID {
        return this.id
    }

    public matches(tag: Tag): boolean {
        return this.tag.matches(tag);
    }
    
    public addComponent(component: Component, componentdata: any) {

        component.setData(this.id, componentdata);
    
        const tagbefore = this.tag.clone();
        this.tag.binaryORInPlace(component.getTag());
    
        for(const view of this.manager.getViews()) {
            if(!tagbefore.matches(view.getTag()) && this.tag.matches(view.getTag())) {
                view.add(this);
            }
        }

        return this;
    }
    
    public removeComponent(component: Component): Entity {

        component.destroyEntity(this);
        
        const tagbefore = this.tag.clone();
        this.tag.binaryNOTInPlace(component.getTag())

        for(const view of this.manager.getViews()) {
            if(tagbefore.matches(view.getTag()) && !this.tag.matches(view.getTag())) {
                view.remove(this);
            }
        }

        return this;
    }

    public hasComponent(component: Component): boolean {
        return this.tag.matches(component.getTag());
    }
    
    public getComponentData(component: Component): { data: any, ok: boolean } {
        if (!component.hasData(this.id)) {
            return { data: undefined, ok: false };
        }

        return { data: component.getData(this.id), ok: true };
    }

    public getManager() : Manager {
        return this.manager;
    }
}

export class QueryResult {
	public entity: Entity;
    public components: Map<Component, any>;
    
    public constructor(entity: Entity, components: Map<Component, any>) {
        this.entity = entity;
        this.components = components;
    }
}

export class QueryResultCollection {
    private mResults: QueryResult[];

    public constructor() {
        this.mResults = [];
    }

    public push(qr: QueryResult): QueryResultCollection {
        this.mResults.push(qr);
        return this;
    }

    public remove(id: EntityID): QueryResultCollection {
        for(const i in this.mResults) {

            if (!this.mResults.hasOwnProperty(i)) { continue; }

            const qr = this.mResults[i];
            if(qr.entity.id === id) {
                this.mResults.splice(parseInt(i, 10), 1);
                break
            }
        }

        return this;
    }

    public entities() : Entity[] {
        return this.mResults.map(qr => qr.entity);
    }

    public results(): QueryResult[] {
        return this.mResults;
    }
}

export class View {

    private mTag: Tag;
    private mResults: QueryResultCollection;

    public constructor(tag: Tag, results: QueryResultCollection) {
        this.mTag = tag;
        this.mResults = results;
    }

    public get(): QueryResultCollection {
        return this.mResults;
    }

    public getTag(): Tag {
        return this.mTag;
    }
    
    public add(entity: Entity) : View {

        const qr = entity.getManager().getEntityByID(
            entity.id,
            this.mTag,
        );

        if(qr !== undefined) {
            this.mResults.push(qr);
        }

        return this;
    }
    
    public remove(entity: Entity) {
        this.mResults.remove(entity.id)
    }
}

export class Manager {

    protected entityIdInc: number;
    protected componentNumInc: number;

    protected entities: Entity[];
    protected entitiesByID: Map<EntityID, Entity>;
    protected components: Component[];
    protected views: View[];

    public constructor() {
        this.entityIdInc = 0;
        this.componentNumInc = 0;
        this.entities = [];
        this.entitiesByID = new Map();
        this.components = [];
        this.views = [];
    }

    public getViews(): View[] {
        return this.views;
    }

    public createView(...tagelements: Array<Tag|Component>) : View {
    
        const tag: Tag = buildTag(...tagelements);
        const qrs = this.query(tag);
        const view = new View(tag, qrs);

        this.views.push(view);

        return view
    }
    
    public newEntity(): Entity {
    
        const nextid = ++this.componentNumInc;
        const id = nextid - 1; // to start at 0
    
        const entity = new Entity(
            id,
            this,
        );
    
        this.entities.push(entity)
        this.entitiesByID.set(entity.id, entity)
    
        return entity
    }
    
    public newComponent(): Component {
    
        if (this.componentNumInc >= 63) {
            throw new Error("Component overflow (limited to 64)");
        }
    
        const nextid = ++this.componentNumInc;
        const id = nextid - 1; // to start at 0
    
        const component = new Component(id);
        this.components.push(component)
    
        return component
    }

    public getEntityByID(id: EntityID, ...tagelements: any[]) : undefined|QueryResult {

        const entity = this.entitiesByID.get(id);
        if(entity === undefined) {
            return undefined;
        }
    
        const tag: Tag = buildTag(...tagelements);
    
        const components = this.fetchComponentsForEntity(entity, tag);
    
        if(components === undefined) {
            return undefined;
        }
    
        return new QueryResult(entity, components);
    }

    public disposeEntities(...entities: Entity[]) {
        for(const entity of entities) {
            this.disposeEntity(entity)
        }
    }
    
    public disposeEntity(entity: Entity|QueryResult) {

        let typedentity: Entity;

        if (entity instanceof Entity) {
            typedentity = entity;
        } else if (entity instanceof QueryResult) {
            typedentity = entity.entity;
        } else {
            throw new Error("Invalid type passed to disposeEntity; accepts only <QueryResult> and <Entity> types.");
        }
    
        for (const component of this.components) {
            if (typedentity.hasComponent(component)) {
                typedentity.removeComponent(component);
            }
        }

        this.entitiesByID.delete(typedentity.id);
    }
    
    public fetchComponentsForEntity(entity: Entity, tag: Tag): undefined|Map<Component, any> {
    
        if(!entity.matches(tag)) {
            return undefined
        }
    
        const componentMap = new Map<Component, any>();
    
        for (const component of this.components) {
            if (tag.matches(component.getTag())) {

                const { data, ok } = entity.getComponentData(component);

                if (!ok) {
                    return undefined // if one of the required components is not set, return nothing !
                }
    
                componentMap.set(component, data);
            }
        }
    
        return componentMap
    }
    
    public query(tag: Tag): QueryResultCollection {
    
        const matches = new QueryResultCollection();
    
        for (const entity of this.entities) {

            if(entity.matches(tag)) {
    
                const componentMap = new Map<Component, any>();
    
                for(const component of this.components) {
                    if(tag.matches(component.getTag())) {
                        const { data } = entity.getComponentData(component)
                        componentMap.set(component, data);
                    }
                }
    
                matches.push(new QueryResult(
                    entity,
                    componentMap,
                ));
            }
        }
    
        return matches
    }
}

export function buildTag(...elements: Array<Tag|Component>): Tag {

	const tag = new Tag();

	for (const element of elements) {
        if (element instanceof Component) {
            tag.binaryORInPlace(element.getTag())
        } else if (element instanceof Tag) {
            tag.binaryORInPlace(element)
        } else {
            throw new Error("Invalid type passed to buildTag; accepts only <Component> and <Tag> types.");
        }
	}

	return tag
}
