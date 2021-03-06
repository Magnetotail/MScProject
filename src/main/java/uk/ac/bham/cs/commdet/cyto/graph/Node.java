package uk.ac.bham.cs.commdet.cyto.graph;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

/**
 * A node with a given id, size, colour and metadata. Id must be a string as
 * specifed by Cytoscape js. A node can be considered as a single vertex with
 * size 1, or a compound node where size represents how many vertices belong to
 * this node.
 */
public class Node implements Serializable {

	private String id;
	private int size;
	private String colour = "blue";
	private Map<String, Object> metadata;
	
	public Node(String id, Map<String, Object> metadata) {
		this.id = id;
		this.metadata = metadata;
	}
	
	public Node(String id, int size) {
		this.id = id;
		this.size = size;
		this.setMetadata(new HashMap<String, Object>());
	}

	public String getId() {
		return id;
	}

	public int getSize() {
		return size;
	}

	protected void setSize(int size) {
		this.size = size;
	}
	
	public String getColour() {
		return colour;
	}

	public void setColour(String colour) {
		this.colour = colour;
	}

	public Map<String, Object> getMetadata() {
		return metadata;
	}

	public void setMetadata(Map<String, Object> metadata) {
		this.metadata = metadata;
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + ((id == null) ? 0 : id.hashCode());
		return result;
	}

	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		Node other = (Node) obj;
		if (id == null) {
			if (other.id != null)
				return false;
		} else if (!id.equals(other.id))
			return false;
		return true;
	}
	
}
