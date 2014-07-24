package uk.ac.bham.cs.commdet.servlet;

import java.io.*;
import java.util.Arrays;
import java.util.logging.Logger;

import javax.servlet.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;

import edu.cmu.graphchi.ChiLogger;

import uk.ac.bham.cs.commdet.cyto.json.GraphJsonGenerator;
import uk.ac.bham.cs.commdet.graphchi.all.GraphResult;

@WebServlet("/UpdateGraph")
public class UpdateGraph extends HttpServlet {

	private static final Logger logger = ChiLogger.getLogger("servlet");

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

		HttpSession session = request.getSession(false);
		String responseString;
		if (session != null) {
			try {
				GraphResult result = (GraphResult)session.getAttribute("result");
				GraphJsonGenerator generator = new GraphJsonGenerator(result);
				int fileLevel = Integer.parseInt(request.getParameter("graphLevel"));
				if (request.getParameter("selectedNode") != null) {
					int community = Integer.parseInt(request.getParameter("selectedNode"));
					int communityLevel = Integer.parseInt(request.getParameter("currentLevel"));
					responseString = generator.getCommunityJson(community, communityLevel - 1, fileLevel);
				} else {
					responseString = generator.getGraphJson(fileLevel);
				}
				logger.info("Response written succesfully");
			} catch (Exception e) {
				responseString = "{ \"success\" : false }";
				logger.info(e.getMessage() + "\n" + Arrays.asList(e.getStackTrace()));
			}
		} else {
			responseString = "{ \"success\" : false }";
		}
		response.setContentType("application/json");
		response.getWriter().println(responseString);
		
	}

}