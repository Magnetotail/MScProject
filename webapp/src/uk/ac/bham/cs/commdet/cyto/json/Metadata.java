package uk.ac.bham.cs.commdet.cyto.json;

import java.io.Serializable;

public class Metadata implements Serializable {
	
	private int NoOfCommunities;
	private int maxCommunitySize;
	private int avgCommunitySize;
	private int minCommunitySize;
	private double modularity;
	private int maxEdgeConnection;
	
	
	public int getNoOfCommunities() {
		return NoOfCommunities;
	}

	public void setNoOfCommunities(int noOfCommunities) {
		NoOfCommunities = noOfCommunities;
	}

	public int getMaxCommunitySize() {
		return maxCommunitySize;
	}

	public void setMaxCommunitySize(int maxCommunitySize) {
		this.maxCommunitySize = maxCommunitySize;
	}

	public int getAvgCommunitySize() {
		return avgCommunitySize;
	}

	public void setAvgCommunitySize(int avgCommunitySize) {
		this.avgCommunitySize = avgCommunitySize;
	}

	public int getMinCommunitySize() {
		return minCommunitySize;
	}

	public void setMinCommunitySize(int minCommunitySize) {
		this.minCommunitySize = minCommunitySize;
	}

	public double getModularity() {
		return modularity;
	}

	public void setModularity(double modularity) {
		this.modularity = modularity;
	}

	public int getMaxEdgeConnection() {
		return maxEdgeConnection;
	}

	public void setMaxEdgeConnection(int maxEdgeConnection) {
		this.maxEdgeConnection = maxEdgeConnection;
	}

}